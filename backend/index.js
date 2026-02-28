// Load environment variables
require('dotenv').config();

const { setupWebSocket } = require('./websocket');
const express = require('express');
const { ERRORS } = require('./lib/errors');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { listContainers, getContainerHealth } = require('./docker/client');
const containerMonitor = require('./docker/monitor');
const healer = require('./docker/healer');

// New Services
const serviceMonitor = require('./services/monitor');
const incidents = require('./services/incidents');
const k8sWatcher = require('./kubernetes/watcher');

// Metrics
const { metricsMiddleware } = require('./metrics/middleware');
const metricsRoutes = require('./routes/metrics.routes');
const { startCollectors } = require('./metrics/collectors');

// RBAC Routes
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const rolesRoutes = require('./routes/roles.routes');
const kubernetesRoutes = require('./routes/kubernetes.routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { requireAuth } = require('./auth/middleware');

// Distributed Traces Routes
const traceRoutes = require('./routes/traces.routes');

// Contact Routes
const contactRoutes = require('./routes/contact.routes');

// Feedback Routes - Operational Memory
const feedbackRoutes = require('./routes/feedback.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(metricsMiddleware); // Metrics middleware

// Rate limiters
app.use('/api', apiLimiter);

app.use('/api/feedback', feedbackRoutes);

// Security Routes
const securityRoutes = require('./routes/security.routes');
app.use('/api/security', requireAuth, securityRoutes);

// RBAC Routes
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);

// Distributed Traces Routes
app.use('/api/traces', traceRoutes);

// Contact Routes
app.use('/api', contactRoutes);

// --- IN-MEMORY DATABASE ---
let systemStatus = {
  services: {
    auth: { status: 'unknown', code: 0, lastUpdated: null },
    payment: { status: 'unknown', code: 0, lastUpdated: null },
    notification: { status: 'unknown', code: 0, lastUpdated: null }
  },
  aiAnalysis: "Waiting for AI report...",
  lastUpdated: new Date()
};

let activityLog = [];
let aiLogs = [];
let nextLogId = 1;

function logActivity(type, message) {
  const entry = {
    id: nextLogId++,
    timestamp: new Date().toISOString(),
    type,
    message
  };
  activityLog.unshift(entry);
  if (activityLog.length > 100) activityLog.pop(); // Keep last 100
  console.log(`[LOG] ${type}: ${message}`);
}

// WebSocket Broadcaster
let wsBroadcaster = { broadcast: () => { } };

// Service configuration
const services = [
  { name: 'auth', url: 'http://localhost:3001/health' },
  { name: 'payment', url: 'http://localhost:3002/health' },
  { name: 'notification', url: 'http://localhost:3003/health' }
];

// Smart Restart Tracking
const restartTracker = new Map(); // containerId -> { attempts: number, lastAttempt: number }
const MAX_RESTARTS = 3;
const GRACE_PERIOD_MS = 60 * 1000; // 1 minute

// --- ENDPOINTS FOR FRONTEND ---

app.get('/api/status', (req, res) => {
  res.json(serviceMonitor.getSystemStatus());
});

app.get('/api/activity', (req, res) => {
  res.json({ activity: incidents.getActivityLog().slice(0, 50) });
});

app.get('/api/insights', (req, res) => {
  res.json({ insights: incidents.getAiLogs().slice(0, 20) });
});

app.post('/api/kestra-webhook', (req, res) => {
  const { aiReport, metrics } = req.body;
  const systemStatus = serviceMonitor.getSystemStatus();
  
  if (aiReport) {
    systemStatus.aiAnalysis = aiReport;
    const insight = incidents.addAiLog(aiReport);

    incidents.logActivity('info', 'Received new AI Analysis report');
    
    if (globalWsBroadcaster) {
        globalWsBroadcaster.broadcast('INCIDENT_NEW', insight);
    }
  }
  systemStatus.lastUpdated = new Date();
  
  if (metrics) {
    Object.keys(metrics).forEach(serviceName => {
      if (systemStatus.services[serviceName]) {
        systemStatus.services[serviceName].code = metrics[serviceName].code || 0;
        const code = metrics[serviceName].code;
        const newStatus = code >= 200 && code < 300 ? 'healthy' :
          code >= 500 ? 'critical' : 'degraded';

        if (systemStatus.services[serviceName].status !== newStatus) {
          const severity = newStatus === 'healthy' ? 'success' : (newStatus === 'critical' ? 'alert' : 'warn');
          incidents.logActivity(severity, `Metric update: ${serviceName} is now ${newStatus}`);
        }

        systemStatus.services[serviceName].status = newStatus;
        systemStatus.services[serviceName].lastUpdated = new Date();
      }
    });

    if (globalWsBroadcaster) {
        globalWsBroadcaster.broadcast('METRICS', systemStatus);
    }
  }

  res.json({ success: true });
});

app.post('/api/action/:service/:type', async (req, res) => {
  const { service, type } = req.params;
  const serviceMap = { 'auth': 3001, 'payment': 3002, 'notification': 3003 };
  const port = serviceMap[service];

  incidents.logActivity('info', `Triggering action '${type}' on service '${service}'`);

  if (!port) {
    incidents.logActivity('warn', `Failed action '${type}': Invalid service '${service}'`);
    return res.status(400).json(ERRORS.SERVICE_NOT_FOUND(service).toJSON());
  }

  try {
    let mode = 'healthy';
    if (type === 'crash' || type === 'down') mode = 'down';
    if (type === 'degraded') mode = 'degraded';
    if (type === 'slow') mode = 'slow';

    await axios.post(`http://localhost:${port}/simulate/${mode}`, {}, { timeout: 5000 });
    // Force a health check to update status immediately
    await serviceMonitor.checkServiceHealth();

    incidents.logActivity('success', `Successfully executed '${type}' on ${service}`);
    res.json({ success: true, message: `${type} executed on ${service}` });
  } catch (error) {
    incidents.logActivity('error', `Action '${type}' on ${service} failed: ${error.message}`);
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

// --- DOCKER ENDPOINTS ---

// Middleware for ID/Service validation (mock auth for docker endpoints)
const requireDockerAuth = (req, res, next) => {
  // In a real app, check 'Authorization' header
  // For now, assume authenticated if internal or trusted
  next();
};

const validateId = (req, res, next) => {
  if (!req.params.id || typeof req.params.id !== 'string' || req.params.id.length < 1) {
    return res.status(400).json(ERRORS.INVALID_ID().toJSON());
  }
  next();
};

const validateScaleParams = (req, res, next) => {
  const replicasRaw = req.params.replicas;
  const replicas = Number(replicasRaw);
  if (!req.params.service || !/^\d+$/.test(replicasRaw) || !Number.isInteger(replicas) || replicas < 0 || replicas > 100) {
    return res.status(400).json(ERRORS.INVALID_SCALE_PARAMS().toJSON());
  }
  next();
};

app.get('/api/docker/containers', async (req, res) => {
  try {
    const containers = await listContainers();
    // Use Promise.allSettled to handle monitoring setup concurrently without crashing
    await Promise.allSettled(containers.map(c => containerMonitor.startMonitoring(c.id)));

    // Enrich with smart restart meta
    const enrichedContainers = containers.map(c => {
      const tracker = restartTracker.get(c.id) || { attempts: 0, lastAttempt: 0 };
      return {
        ...c,
        metrics: containerMonitor.getMetrics(c.id), // Include current metrics snapshot
        restartCount: tracker.attempts,
        lastRestart: tracker.lastAttempt
      };
    });

    res.json({ containers: enrichedContainers });
  } catch (error) {
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

app.get('/api/docker/health/:id', validateId, async (req, res) => {
  try {
    const health = await getContainerHealth(req.params.id);
    res.json(health);
  } catch (error) {
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

app.get('/api/docker/metrics/:id', validateId, (req, res) => {
  const metrics = containerMonitor.getMetrics(req.params.id);
  if (!metrics) {
    return res.status(404).json(ERRORS.NO_DATA().toJSON());
  }
  res.json(metrics);
});

app.post('/api/docker/try-restart/:id', requireDockerAuth, validateId, async (req, res) => {
  const id = req.params.id;
  const now = Date.now();
  let tracker = restartTracker.get(id) || { attempts: 0, lastAttempt: 0 };

  // Reset attempts if outside grace period
  if (now - tracker.lastAttempt > GRACE_PERIOD_MS) {
    tracker.attempts = 0;
  }

  if (tracker.attempts >= MAX_RESTARTS) {
    return res.status(429).json(ERRORS.MAX_RESTARTS_EXCEEDED().toJSON());
  }

  tracker.attempts++;
  tracker.lastAttempt = now;
  restartTracker.set(id, tracker);

  try {
    const result = await healer.restartContainer(id);
    res.json({ allowed: true, ...result });
  } catch (error) {
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

app.post('/api/docker/restart/:id', requireDockerAuth, validateId, async (req, res) => {
  // Manual override bypasses smart checks, or update tracker manually
  const id = req.params.id;
  // Update tracker so manual restarts count towards limits or reset headers? 
  // For manual, we usually want to force it. We won't incr limits but update 'lastAttempt' timestamp
  const now = Date.now();
  let tracker = restartTracker.get(id) || { attempts: 0, lastAttempt: 0 };
  tracker.lastAttempt = now;
  restartTracker.set(id, tracker);

  try {
    const result = await healer.restartContainer(id);
    res.json(result);
  } catch (error) {
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

app.post('/api/docker/recreate/:id', requireDockerAuth, validateId, async (req, res) => {
  try {
    const result = await healer.recreateContainer(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

app.post('/api/docker/scale/:service/:replicas', requireDockerAuth, validateScaleParams, async (req, res) => {
  try {
    const result = await healer.scaleService(req.params.service, req.params.replicas);
    res.json(result);
  } catch (error) {
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

let globalWsBroadcaster;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sentinel Backend running on http://0.0.0.0:${PORT}`);
});

// Setup WebSocket
globalWsBroadcaster = setupWebSocket(server);
serviceMonitor.setWsBroadcaster(globalWsBroadcaster);

// K8s Watcher Event Handling
k8sWatcher.on('oom', (pod) => {
    incidents.logActivity('alert', `K8s: Pod ${pod.name} (ns: ${pod.namespace}) OOMKilled`);
    if (globalWsBroadcaster) {
        globalWsBroadcaster.broadcast('K8S_EVENT', {
            type: 'OOM',
            pod,
            message: `Pod ${pod.name} was OOMKilled`
        });
    }
});

k8sWatcher.on('crashloop', (pod) => {
    incidents.logActivity('warn', `K8s: Pod ${pod.name} (ns: ${pod.namespace}) CrashLoopBackOff`);
    if (globalWsBroadcaster) {
        globalWsBroadcaster.broadcast('K8S_EVENT', {
            type: 'CRASHLOOP',
            pod,
            message: `Pod ${pod.name} is in CrashLoopBackOff`
        });
    }
});
