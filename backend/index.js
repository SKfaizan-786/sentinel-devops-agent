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
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
=======
const scalingPredictor = require('./docker/scaling-predictor');
const { insertActivityLog, getActivityLogs, insertAIReport, getAIReports } = require('./db/logs');
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
const { routeEvent } = require('./config/notifications');
const { loadServicesConfig, getAllServices, getClusterIds } = require('./config/services');

const pendingApprovals = new Map();

function executeHealing(incident) {
  logActivity('info', `Executing healing for incident ${incident.id}`);
  routeEvent('healing.started', incident);

  setTimeout(() => {
    logActivity('success', `Healing completed for incident ${incident.id}`);
    routeEvent('healing.completed', incident);
  }, 6000); // Simulate healing duration
}

function initiateHealingProtocol(incident) {
  const incidentId = String(incident.id);
  const configuredTimeout = Number(process.env.AUTO_HEAL_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : 5 * 60 * 1000;
  const timeout = setTimeout(() => {
    const approval = pendingApprovals.get(incidentId);
    if (approval) {
      pendingApprovals.delete(incidentId);
      logActivity('warn', `Timeout reached for ${incidentId}, auto-proceeding with healing.`);
      executeHealing(incident);
    }
  }, timeoutMs); // Configurable auto-proceed timeout

  pendingApprovals.set(incidentId, {
    incident,
    timeout
  });

  routeEvent('incident.detected', incident);
}
=======
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")

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
const approvalsRoutes = require('./routes/approvals.routes');
const kubernetesRoutes = require('./routes/kubernetes.routes');
const { apiLimiter } = require('./middleware/rateLimiter');

// Distributed Traces Routes
const traceRoutes = require('./routes/traces.routes');

<<<<<<< HEAD
=======
// Contact Routes
const contactRoutes = require('./routes/contact.routes');

// Feedback Routes - Operational Memory
const feedbackRoutes = require('./routes/feedback.routes');

// Reasoning Routes - AI Transparency
const reasoningRoutes = require('./routes/reasoning.routes');

// FinOps Routes & Collector
const finopsRoutes = require('./finops/routes');
const { startCollector: startFinOpsCollector } = require('./finops/metricsCollector');

>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(metricsMiddleware); // Metrics middleware

// Rate limiters
app.use('/api', apiLimiter);

// Routes
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/slo', sloRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/approvals', approvalsRoutes);

// FinOps Routes
app.use('/api/finops', finopsRoutes);

// Distributed Traces Routes
app.use('/api/traces', traceRoutes);

<<<<<<< HEAD
// --- IN-MEMORY DATABASE ---
=======
// Contact Routes
app.use('/api', contactRoutes);

// Reasoning Routes - AI Transparency
app.use('/api/reasoning', requireAuth, reasoningRoutes);

// Load services configuration dynamically
const { 
  getAllServices: getConfiguredServices, 
  getServicesByCluster,
  getServicesByRegion,
  getServicePortMap,
  getRemoteAgentConfig 
} = require('./config/servicesLoader');

// --- IN-MEMORY DATABASE ---
// Initialize system status from configuration
const configuredServices = getConfiguredServices();
function initializeSystemStatus() {
  const servicesState = {};
  for (const svc of configuredServices) {
    servicesState[svc.name] = { 
      status: 'unknown', 
      code: 0, 
      lastUpdated: null,
      cluster: svc.cluster,
      clusterName: svc.clusterName,
      region: svc.region
    };
  }
  return {
    services: servicesState,
    clusters: getServicesByCluster(),
    aiAnalysis: "Waiting for AI report...",
    lastUpdated: new Date()
  };
}

let systemStatus = initializeSystemStatus();

>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
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
  if (activityLog.length > 100) activityLog.pop(); // Keep last 100 in memory
  console.log(`[LOG] ${type}: ${message}`);
<<<<<<< HEAD
=======

  // Persist to PostgreSQL (fire-and-forget)
  insertActivityLog(type, message).catch(() => { });

  // Broadcast the new log entry to all connected WebSocket clients
  wsBroadcaster.broadcast('ACTIVITY_LOG', entry);
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
}

// WebSocket Broadcaster
let wsBroadcaster = { broadcast: () => { } };

<<<<<<< HEAD
=======
// Service configuration - loaded dynamically from services.config.json
const services = configuredServices.map(s => ({
  name: s.name,
  url: s.url,
  type: s.type,
  cluster: s.cluster,
  clusterName: s.clusterName,
  region: s.region,
  port: s.port
}));

>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
// Smart Restart Tracking
const restartTracker = new Map(); // containerId -> { attempts: number, lastAttempt: number }
const MAX_RESTARTS = 3;
const GRACE_PERIOD_MS = 60 * 1000; // 1 minute

// --- ENDPOINTS FOR FRONTEND ---

app.get('/api/status', (req, res) => {
  res.json(serviceMonitor.getSystemStatus());
});

<<<<<<< HEAD
app.get('/api/services', (req, res) => {
  res.json({ services: serviceMonitor.getAllServicesInfo() });
});

app.get('/api/clusters', (req, res) => {
  const config = loadServicesConfig();
  const clusters = getClusterIds(config).map(id => ({
    id,
    label: config.clusters[id].label,
    region: config.clusters[id].region
  }));
  res.json({ clusters });
});

app.get('/api/activity', (req, res) => {
  res.json({ activity: incidents.getActivityLog().slice(0, 50) });
=======
app.get('/api/activity', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const { logs, total } = await getActivityLogs(limit, offset);
    res.json({ activity: logs, total, limit, offset });
  } catch (err) {
    // Fallback to in-memory via incidents service
    res.json({ activity: incidents.getActivityLog().slice(offset, offset + limit) });
  }
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
});

app.get('/api/insights', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const { reports, total } = await getAIReports(limit, offset);
    res.json({ insights: reports, total, limit, offset });
  } catch (err) {
    // Fallback to in-memory via incidents service
    res.json({ insights: incidents.getAiLogs().slice(offset, offset + limit) });
  }
});

// --- REMOTE AGENT ENDPOINTS ---
const AGENT_WEBHOOK_SECRET = process.env.AGENT_WEBHOOK_SECRET;

function verifyAgentAuth(req, res, next) {
  const agentSecret = req.headers['x-agent-secret'];
  
  if (!AGENT_WEBHOOK_SECRET) {
    console.warn('AGENT_WEBHOOK_SECRET not configured, agent auth bypassed');
    return next();
  }
  
  if (!agentSecret || agentSecret !== AGENT_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid agent secret' });
  }
  
  next();
}

app.post('/api/agent/metrics', verifyAgentAuth, (req, res) => {
  const { clusterId, services, timestamp } = req.body;
  
  if (!clusterId || !services) {
    return res.status(400).json({ error: 'Missing required fields: clusterId, services' });
  }
  
  const success = serviceMonitor.handleAgentMetrics({
    clusterId,
    services,
    timestamp: timestamp || new Date()
  });
  
  if (success) {
    res.json({ success: true, message: 'Metrics processed' });
  } else {
    res.status(400).json({ error: 'Failed to process metrics' });
  }
});

app.post('/api/kestra-webhook', (req, res) => {
  const { aiReport, metrics } = req.body;
  const systemStatus = serviceMonitor.getSystemStatus();
  
  if (aiReport) {
    systemStatus.aiAnalysis = aiReport;
<<<<<<< HEAD
    const insight = incidents.addAiLog(aiReport);
=======
    // Create an incident/insight object
    const insight = {
      id: Date.now(),
      timestamp: new Date(),
      analysis: aiReport,
      summary: aiReport
    };
    aiLogs.unshift(insight);
    if (aiLogs.length > 50) aiLogs.pop();

    // Persist to PostgreSQL (fire-and-forget)
    insertAIReport(aiReport, aiReport).catch(() => { });

    logActivity('info', 'Received new AI Analysis report');

    // Broadcast new incident/insight
    wsBroadcaster.broadcast('INCIDENT_NEW', insight);

    // Call routeEvent with the incident payload for ChatOps
    initiateHealingProtocol({
      ...insight,
      title: 'Application Insight Alert',
      description: insight.summary,
      type: 'ai_insight',
      severity: 'Medium'
    });
    const newInsight = incidents.addAiLog(aiReport);
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963

    incidents.logActivity('info', 'Received new AI Analysis report');
    
    if (globalWsBroadcaster) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
      globalWsBroadcaster.broadcast('INCIDENT_NEW', newInsight);
=======
        globalWsBroadcaster.broadcast('INCIDENT_NEW', insight);
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
      globalWsBroadcaster.broadcast('INCIDENT_NEW', insight);
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
      globalWsBroadcaster.broadcast('INCIDENT_NEW', insight);
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
      globalWsBroadcaster.broadcast('INCIDENT_NEW', insight);
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
      globalWsBroadcaster.broadcast('INCIDENT_NEW', insight);
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
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
  // Use dynamic service port mapping from configuration
  const servicePortMap = getServicePortMap();
  const port = servicePortMap[service];

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
  incidents.logActivity('info', `Triggering action '${type}' on service '${service}'`);
=======
  incidents.logActivity('info', ERRORS.SERVICE_NOT_FOUND(service).toJSON()ervice}'`);
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)

=======
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
  if (!port) {
    incidents.logActivity('warn', `Failed action '${type}': Invalid service '${service}'`);
    return res.status(400).json({ success: false, error: 'Invalid service' });
  }

  // Find service URL base from configuration
  const serviceConfig = services.find(s => s.name === service);
  const serviceUrl = serviceConfig ? new URL(serviceConfig.url).origin : `http://localhost:${port}`;

  try {
    let mode = 'healthy';
    if (type === 'crash' || type === 'down') mode = 'down';
    if (type === 'degraded') mode = 'degraded';
    if (type === 'slow') mode = 'slow';

    await axios.post(`${serviceUrl}/simulate/${mode}`, {}, { timeout: 5000 });
    // Force a health check to update status immediately
    await serviceMonitor.checkServiceHealth();

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
    incidents.logActivity('success', `Successfully executed '${type}' on ${service}`);
=======
    incidents.logActivityERRORS.ACTION_FAILED().toJSON()pe}' on ${service}`);
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
    incidents.logActivity('info', `Action '${type}' executed on ${service}`);
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
    incidents.logActivity('info', `Action '${type}' executed on ${service}`);
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
    incidents.logActivity('info', `Action '${type}' executed on ${service}`);
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
    incidents.logActivity('info', `Action '${type}' executed on ${service}`);
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
    res.json({ success: true, message: `${type} executed on ${service}` });
  } catch (error) {
    incidents.logActivity('error', `Action '${type}' on ${service} failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- DOCKER ENDPOINTS ---

// Middleware for ID/Service validation (mock auth for docker endpoints)
const requireDockerAuth = (req, res, next) => {
  // In a real app, check 'Authorization' header
  // For now, assume authenticated if internal or trusted
  next();
<<<<<<< HEAD
};

const validateId = (req, res, next) => {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
  if (!req.params.id || typeof req.params.id !== 'string' || req.params.id.length < 1) {
    return res.status(400).json(ERRORS.INVALID_ID().toJSON());
=======
};ERRORS.INVALID_ID().toJSON());
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
  if (!req.params.id) {
    return res.status(400).json({ error: 'Invalid ID' });
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
  if (!req.params.id) {
    return res.status(400).json({ error: 'Invalid ID' });
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
  if (!req.params.id) {
    return res.status(400).json({ error: 'Invalid ID' });
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
  if (!req.params.id) {
    return res.status(400).json({ error: 'Invalid ID' });
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
  }
  next();
};

const validateScaleParams = (req, res, next) => {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
  const replicasRaw = req.params.replicas;
  const replicas = Number(replicasRaw);
  if (!req.params.service || !/^\d+$/.test(replicasRaw) || !Number.isInteger(replicas) || replicas < 0 || replicas > 100) {
<<<<<<< HEAD
    return res.status(400).json(ERRORS.INVALID_SCALE_PARAMS().toJSON());
=======
    return res.status(400).json(ERRORS.INVALID_SCALE_PARAMS().toJSON()
const validateScaleParams = (req, res, next) => {
  const replicas = parseInt(req.params.replicas, 10);
  if (!req.params.service || isNaN(replicas) || replicas < 0 || replicas > 100) {
    return res.status(400).json({ error: 'Invalid scale parameters' });
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
  const replicas = parseInt(req.params.replicas, 10);
  if (!req.params.service || isNaN(replicas) || replicas < 0 || replicas > 100) {
    return res.status(400).json({ error: 'Invalid scale parameters' });
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
  const replicas = parseInt(req.params.replicas, 10);
  if (!req.params.service || isNaN(replicas) || replicas < 0 || replicas > 100) {
    return res.status(400).json({ error: 'Invalid scale parameters' });
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
  const replicas = parseInt(req.params.replicas, 10);
  if (!req.params.service || isNaN(replicas) || replicas < 0 || replicas > 100) {
    return res.status(400).json({ error: 'Invalid scale parameters' });
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
  const replicas = parseInt(req.params.replicas, 10);
  if (!req.params.service || isNaN(replicas) || replicas < 0 || replicas > 100) {
    return res.status(400).json({ error: 'Invalid scale parameters' });
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
  }
  next();
};

app.get('/api/docker/containers', async (req, res) => {
  try {
    const containers = await listContainers();
    // Monitor initialization is now global and event-driven via monitor.init()
    // No need to aggressively start monitoring on every list request

    // Enrich with smart restart meta
    const enrichedContainers = containers.map(c => {
      const tracker = restartTracker.get(c.id) || { attempts: 0, lastAttempt: 0 };
      return {
        ...c,
        metrics: containerMonitor.getMetrics(c.id), // Include current metrics snapshot
        restartCount: tracker.attempts,
        lastRestart: tracker.lastAttempt
      };ERRORS.DOCKER_CONNECTION().toJSON()
    });

    res.json({ containers: enrichedContainers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/docker/healERRORS.DOCKER_CONNECTION().toJSON()nc (req, res) => {
  try {
    const health = await getContainerHealth(req.params.id);
    res.json(health);
  } catch (error) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
=======
    res.status(500).json({ error: error.message });
  if (!metrics) {
    return res.status(404).json(ERRORS.NO_DATA().toJSON());
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
    res.status(500).json({ error: error.message });
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
    res.status(500).json({ error: error.message });
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
    res.status(500).json({ error: error.message });
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
    res.status(500).json({ error: error.message });
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
  }
  res.json(metrics
});

app.get('/api/docker/metrics/:id', validateId, (req, res) => {
  const metrics = containerMonitor.getMetrics(req.params.id);
  res.json(metrics || { error: 'No metrics available' });
});

app.post('/api/docker/try-restart/:id', requireDockerAuth, validateId, async (req, res) => {
  const id = req.params.id;
  const now = Date.now();
  let tracker = restartTracker.get(id) || { attempts: 0, lastAttempt: 0 };

  // Reset attempts if outside grace period
<<<<<<< HEAD
  if (now - tracker.lastAttempt > GRACE_PERIOD_MS) {
    tracker.attempts = 0;
  }
  if (tracker.attempts >= MAX_RESTARTS) {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
    return res.status(429).json(ERRORS.MAX_RESTARTS_EXCEEDED().toJSON());
=======
  if (now - tracker.lastAttempt ERRORS.MAX_RESTARTS_EXCEEDED().toJSON());
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
    return res.status(429).json({ error: 'Max restarts exceeded' });
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
    return res.status(429).json({ error: 'Max restarts exceeded' });
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
    return res.status(429).json({ error: 'Max restarts exceeded' });
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
    return res.status(429).json({ error: 'Max restarts exceeded' });
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
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
  try {
    const result = await healer.restartContainer(id);
<<<<<<< HEAD
=======

    // Broadcast updated containers after restart
    try {
      const containers = await listContainers();
      const enriched = containers.map(c => ({
        ...c,
        metrics: containerMonitor.getMetrics(c.id),
        restartCount: (restartTracker.get(c.id) || { attempts: 0 }).attempts,
        lastRestart: (restartTracker.get(c.id) || { lastAttempt: 0 }).lastAttempt
      }));
      wsBroadcaster.broadcast('CONTAINER_UPDATE', { containers: enriched });
    } catch (_) { /* best-effort broadcast */ }

>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
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

<<<<<<< HEAD
<<<<<<< HEAD
let globalWsBroadcaster;

const hostsConfig = loadHostsConfig();

(async () => {
  await hostManager.loadHosts(hostsConfig);
  console.log(`🔗 Docker Host Manager initialized with ${hostsConfig.length} host(s)`);

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sentinel Backend running on http://0.0.0.0:${PORT}`);
  });
=======
app.post('/api/docker/scale/:service/:replicas', requireDockerAuth, validateScaleParams, async (req, res) => {
  const result = await healer.scaleService(req.params.service, req.params.replicas);
  res.json(result);
=======
// ============================================
// MULTI-CLUSTER / MULTI-REGION API ENDPOINTS
// ============================================

/**
 * GET /api/clusters - Get all services grouped by cluster
 */
app.get('/api/clusters', (req, res) => {
  const clusters = serviceMonitor.getServicesGroupedByCluster();
  res.json({ clusters });
});

/**
 * GET /api/regions - Get all services grouped by region
 */
app.get('/api/regions', (req, res) => {
  const regions = serviceMonitor.getServicesGroupedByRegion();
  res.json({ regions });
});

/**
 * GET /api/services/grouped - Get services with cluster/region metadata
 */
app.get('/api/services/grouped', (req, res) => {
  const groupBy = req.query.groupBy || 'cluster';
  
  if (groupBy === 'region') {
    res.json({ 
      groupBy: 'region',
      data: serviceMonitor.getServicesGroupedByRegion() 
    });
  } else {
    res.json({ 
      groupBy: 'cluster',
      data: serviceMonitor.getServicesGroupedByCluster() 
    });
  }
});

/**
 * POST /api/remote-agent/report - Receive health reports from remote agents
 * Protected by webhook secret verification
 */
app.post('/api/remote-agent/report', (req, res) => {
  const remoteAgentConfig = getRemoteAgentConfig();
  
  // Verify webhook secret if configured
  if (remoteAgentConfig.webhookSecret) {
    const signature = req.headers['x-sentinel-signature'];
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature header' });
    }
    
    const hmac = crypto.createHmac('sha256', remoteAgentConfig.webhookSecret);
    // Use raw body for HMAC verification to ensure consistency
    const bodyToVerify = req.rawBody || JSON.stringify(req.body);
    hmac.update(bodyToVerify);
    const expectedSignature = 'sha256=' + hmac.digest('hex');
    
    // Check signature lengths first to avoid timingSafeEqual throwing on length mismatch
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');
    
    if (signatureBuffer.length !== expectedBuffer.length) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
    
    if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }
  
  const { type, clusterId, clusterName, region, timestamp, services: reportedServices } = req.body;
  
  if (type !== 'agent_report') {
    return res.status(400).json({ error: 'Invalid report type' });
  }
  
  if (!clusterId || !reportedServices) {
    return res.status(400).json({ error: 'Missing clusterId or services in report' });
  }
  
  // Handle the remote agent report
  serviceMonitor.handleRemoteAgentReport({
    clusterId,
    clusterName: clusterName || clusterId,
    region: region || 'remote',
    services: reportedServices
  });
  
  logActivity('info', `Received health report from remote agent: ${clusterId} (${Object.keys(reportedServices).length} services)`);
  
  res.json({ 
    success: true, 
    message: `Report received for cluster ${clusterId}`,
    timestamp: new Date().toISOString()
  });
});

/**
 * GET /api/remote-agent/status - Check remote agent configuration status
 */
app.get('/api/remote-agent/status', (req, res) => {
  const config = getRemoteAgentConfig();
  res.json({
    enabled: config.enabled,
    hasWebhookSecret: !!config.webhookSecret,
    endpointsCount: config.endpoints.length
  });
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
});

let globalWsBroadcaster;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sentinel Backend running on http://0.0.0.0:${PORT}`);
  // Start FinOps metrics collector
  startFinOpsCollector();
});
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)

<<<<<<< HEAD
  // Setup WebSocket
  globalWsBroadcaster = setupWebSocket(server);
  serviceMonitor.setWsBroadcaster(globalWsBroadcaster);

<<<<<<< HEAD
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
=======
=======
// Setup WebSocket
globalWsBroadcaster = setupWebSocket(server);
wsBroadcaster = globalWsBroadcaster; // Synergize both references
serviceMonitor.setWsBroadcaster(globalWsBroadcaster);

// Initialize Predictive Scaling Engine
scalingPredictor.init(containerMonitor, globalWsBroadcaster);

// React to scale recommendations
scalingPredictor.on('scale-recommendation', (prediction) => {
  logActivity('alert', `🔮 Scale Alert: ${prediction.containerName} at ${Math.round(prediction.failureProbability * 100)}% failure risk — Recommendation: ${prediction.recommendation}`);
});

// Listen for container predictions - MUST be before init to catch startup predictions
containerMonitor.on('prediction', (prediction) => {
  if (prediction.probability > 0.8 && prediction.confidence !== 'low') {
    incidents.logActivity('alert', `🔮 Prediction: Container ${prediction.containerId.substring(0, 12)} risk ${Math.round(prediction.probability * 100)}%. ${prediction.reason}`);

    if (prediction.probability > 0.85) {
      console.log(`[Healing] manual intervention recommended for ${prediction.containerId}`);
    }
  }

  if (globalWsBroadcaster) {
    globalWsBroadcaster.broadcast('PREDICTION', prediction);
  }
});

// Initialize monitoring on startup - After listeners are attached
containerMonitor.init();

>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
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

<<<<<<< HEAD
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

// Start watching default namespace by default (can be expanded via API)
k8sWatcher.watchPods('default', (type, pod) => {
    if (globalWsBroadcaster) {
        globalWsBroadcaster.broadcast('K8S_POD_UPDATE', { type, pod });
    }
});
k8sWatcher.watchEvents('default', (event) => {
     if (globalWsBroadcaster) {
        globalWsBroadcaster.broadcast('K8S_EVENT_STREAM', event);
    }
});
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)

<<<<<<< HEAD

=======
>>>>>>> parent of 608787c (merge this branch)
=======
<<<<<<< HEAD
>>>>>>> parent of c92d731 (feat: Implement core backend container healing, monitoring, and security scanning capabilities, complemented by new frontend host health and selection UI.)
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

  // Start watching default namespace by default (can be expanded via API)
  k8sWatcher.watchPods('default', (type, pod) => {
    if (globalWsBroadcaster) {
      globalWsBroadcaster.broadcast('K8S_POD_UPDATE', { type, pod });
    }
  });
  k8sWatcher.watchEvents('default', (event) => {
    if (globalWsBroadcaster) {
      globalWsBroadcaster.broadcast('K8S_EVENT_STREAM', event);
    }
  });


  // Start Monitoring
  serviceMonitor.startMonitoring();
  startCollectors(); // Start Prometheus collectors
})(); // End of server start IIFE
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
  if (globalWsBroadcaster) {
    globalWsBroadcaster.broadcast('K8S_POD_UPDATE', { type, pod });
  }
});
<<<<<<< HEAD
=======

// Start watching default namespace by default (can be expanded via API)
k8sWatcher.watchPods('default', (type, pod) => {
  if (globalWsBroadcaster) {
    globalWsBroadcaster.broadcast('K8S_POD_UPDATE', { type, pod });
  }
});
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
k8sWatcher.watchEvents('default', (event) => {
  if (globalWsBroadcaster) {
    globalWsBroadcaster.broadcast('K8S_EVENT_STREAM', event);
  }
});


// Start Monitoring
serviceMonitor.startMonitoring();
startCollectors(); // Start Prometheus collectors
<<<<<<< HEAD
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
>>>>>>> parent of 608787c (merge this branch)
=======
=======
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
>>>>>>> 850077c8636677863b3a5d51aa349eb4cc2e3026
>>>>>>> parent of c92d731 (feat: Implement core backend container healing, monitoring, and security scanning capabilities, complemented by new frontend host health and selection UI.)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
