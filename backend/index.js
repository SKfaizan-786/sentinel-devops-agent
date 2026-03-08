// Load environment variables
require('dotenv').config();

const { setupWebSocket } = require('./websocket');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { listContainers, getContainerHealth } = require('./docker/client');
const monitor = require('./docker/monitor');
const healer = require('./docker/healer');
const { v4: uuidv4 } = require('uuid');

// RBAC Routes
const authRoutes = require('./routes/auth.routes');
const usersRoutes = require('./routes/users.routes');
const rolesRoutes = require('./routes/roles.routes');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// RBAC Routes
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);

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

// Continuous health checking
let isChecking = false;

async function checkServiceHealth() {
  if (isChecking) return;
  isChecking = true;

  try {
    console.log('🔍 Checking service health...');
    let hasChanges = false;

    for (const service of services) {
      let newStatus, newCode;
      try {
        const response = await axios.get(service.url, { timeout: 30000 });
        console.log(`✅ ${service.name}: ${response.status} - ${response.data.status}`);
        newStatus = 'healthy';
        newCode = response.status;
      } catch (error) {
        const code = error.response?.status || 503;
        console.log(`❌ ${service.name}: ERROR - ${error.code || error.message}`);
        newStatus = code >= 500 ? 'critical' : 'degraded';
        newCode = code;
      }

      if (
        systemStatus.services[service.name].status !== newStatus ||
        systemStatus.services[service.name].code !== newCode
      ) {
        const prevStatus = systemStatus.services[service.name].status;

        // Log Status Changes
        if (newStatus === 'healthy' && prevStatus !== 'healthy' && prevStatus !== 'unknown') {
          logActivity('success', `Service ${service.name} recovered to HEALTHY`);
        } else if (newStatus !== 'healthy' && prevStatus !== newStatus) {
          const severity = newStatus === 'critical' ? 'alert' : 'warn';
          logActivity(severity, `Service ${service.name} is ${newStatus.toUpperCase()} (Code: ${newCode})`);
        }

        systemStatus.services[service.name] = {
          status: newStatus,
          code: newCode,
          lastUpdated: new Date()
        };
        hasChanges = true;

        // Broadcast individual service update
        wsBroadcaster.broadcast('SERVICE_UPDATE', {
          name: service.name,
          ...systemStatus.services[service.name]
        });
      }
    }

    if (hasChanges) {
      systemStatus.lastUpdated = new Date();
      // Broadcast full metrics update
      wsBroadcaster.broadcast('METRICS', systemStatus);
    }
  } finally {
    isChecking = false;
  }
}

setInterval(checkServiceHealth, 5000);
checkServiceHealth();

// --- ENDPOINTS FOR FRONTEND ---

app.get('/api/status', (req, res) => {
  res.json(systemStatus);
});

app.get('/api/activity', (req, res) => {
  res.json({ activity: activityLog.slice(0, 50) });
});

app.get('/api/insights', (req, res) => {
  res.json({ insights: aiLogs.slice(0, 20) });
});

app.post('/api/kestra-webhook', (req, res) => {
  const { aiReport, metrics } = req.body;
  if (aiReport) {
    systemStatus.aiAnalysis = aiReport;
    // Create an incident/insight object
    const insight = {
      id: uuidv4(),
      timestamp: new Date(),
      analysis: aiReport,
      summary: aiReport
    };
    aiLogs.unshift(insight);
    if (aiLogs.length > 50) aiLogs.pop();

    logActivity('info', 'Received new AI Analysis report');

    // Broadcast new incident/insight
    wsBroadcaster.broadcast('INCIDENT_NEW', insight);
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
          logActivity(severity, `Metric update: ${serviceName} is now ${newStatus}`);
        }

        systemStatus.services[serviceName].status = newStatus;
        systemStatus.services[serviceName].lastUpdated = new Date();
      }
    });
    // Broadcast metrics update from webhook
    wsBroadcaster.broadcast('METRICS', systemStatus);
  }
  res.json({ success: true });
});

app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  
  let metrics = '';
  
  // Sentinel health metrics
  metrics += '# HELP sentinel_container_health Container health status (1=healthy, 0=unhealthy)\n';
  metrics += '# TYPE sentinel_container_health gauge\n';
  Object.keys(systemStatus.services).forEach(name => {
    const val = systemStatus.services[name].status === 'healthy' ? 1 : 0;
    metrics += `sentinel_container_health{name="${name}"} ${val}\n`;
  });

  // Incidents count (from aiLogs for simplicity in this mvp)
  metrics += '\n# HELP sentinel_incidents_total Total number of critical/degraded incidents detected\n';
  metrics += '# TYPE sentinel_incidents_total counter\n';
  const incidentCount = aiLogs.filter(l => l.type === 'PROMETHEUS_INVESTIGATION' || l.analysis.includes('CRITICAL')).length;
  metrics += `sentinel_incidents_total ${incidentCount}\n`;

  // Healing success rate (placeholder for future actual tracking)
  metrics += '\n# HELP sentinel_healing_success_total Total successful auto-healing actions\n';
  metrics += '# TYPE sentinel_healing_success_total counter\n';
  metrics += `sentinel_healing_success_total ${activityLog.filter(l => l.type === 'success' && l.message.includes('recovered')).length}\n`;

  res.send(metrics);
});

// --- PROMETHEUS ALERTMANAGER WEBHOOK ---
app.post('/api/webhooks/alertmanager', async (req, res) => {
  const { alerts, status: groupStatus } = req.body;
  const token = req.query.token;
  const SECRET = process.env.ALERTMANAGER_SECRET || 'sentinel-secret-123';

  if (token !== SECRET) {
    console.error('[ALERTMANAGER] Unauthorized webhook attempt');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!alerts || !Array.isArray(alerts)) {
    return res.status(400).json({ error: 'Invalid Alertmanager payload' });
  }

  console.log(`[ALERTMANAGER] Received ${alerts.length} alerts with status: ${groupStatus}`);

  for (const alert of alerts) {
    try {
      const status = alert.status || groupStatus || 'unknown';
      const labels = alert.labels || {};
      const annotations = alert.annotations || {};
      
      const alertName = labels.alertname || 'Unknown Alert';
      const severity = labels.severity || 'info';
      const instance = labels.instance || 'unknown';
      const summary = annotations.summary || annotations.description || 'No summary provided';

      const logSeverity = status === 'firing' ? (severity === 'critical' ? 'alert' : 'warn') : 'success';
      logActivity(logSeverity, `Prometheus Alert [${status.toUpperCase()}]: ${alertName} on ${instance} - ${summary}`);

      if (status === 'firing') {
        // Trigger "AI Investigation"
        const investigationId = uuidv4();
        const insight = {
          id: investigationId,
          timestamp: new Date(),
          type: 'PROMETHEUS_INVESTIGATION',
          alertName,
          severity,
          instance,
          summary,
          status: 'investigating',
          analysis: `🔍 Sentinel AI is investigating ${alertName} on ${instance}...\n\n` +
            `Detected: ${summary}\n` +
            `Severity: ${severity.toUpperCase()}\n\n` +
            `Rule: Check logs for ${instance} and verify service health.`
        };

        aiLogs.unshift(insight);
        if (aiLogs.length > 50) aiLogs.pop();

        // Broadcast the new incident
        wsBroadcaster.broadcast('INCIDENT_NEW', insight);

        // Dispatch Kestra investigation
        const kestraEndpoint = process.env.KESTRA_ENDPOINT || 'http://localhost:8080';
        try {
          console.log(`[AI] Dispatching investigation for ${alertName} to Kestra at ${kestraEndpoint}`);
          await axios.post(`${kestraEndpoint}/api/v1/executions/sentinel/intelligent-monitor`, {
            alert: alertName,
            instance: instance,
            severity: severity,
            summary: summary
          }, { timeout: 2000 });
        } catch (err) {
          console.warn(`[AI] Kestra dispatch failed (is Kestra running?): ${err.message}`);
        }
      }
    } catch (err) {
      console.error(`[ALERTMANAGER] Error processing individual alert: ${err.message}`);
    }
  }

  res.json({ success: true, message: `Processed ${alerts.length} alerts` });
});

app.post('/api/action/:service/:type', async (req, res) => {
  const { service, type } = req.params;
  const serviceMap = { 'auth': 3001, 'payment': 3002, 'notification': 3003 };
  const port = serviceMap[service];

  logActivity('info', `Triggering action '${type}' on service '${service}'`);

  if (!port) {
    logActivity('warn', `Failed action '${type}': Invalid service '${service}'`);
    return res.status(400).json({ success: false, error: 'Invalid service' });
  }

  try {
    let mode = 'healthy';
    if (type === 'crash' || type === 'down') mode = 'down';
    if (type === 'degraded') mode = 'degraded';
    if (type === 'slow') mode = 'slow';

    await axios.post(`http://localhost:${port}/simulate/${mode}`, {}, { timeout: 5000 });
    // Force a health check to update status immediately
    await checkServiceHealth();

    logActivity('success', `Successfully executed '${type}' on ${service}`);
    res.json({ success: true, message: `${type} executed on ${service}` });
  } catch (error) {
    logActivity('error', `Action '${type}' on ${service} failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
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
    return res.status(400).json({ error: 'Invalid ID provided' });
  }
  next();
};

const validateScaleParams = (req, res, next) => {
  const replicas = parseInt(req.params.replicas, 10);
  if (!req.params.service || isNaN(replicas) || replicas < 0 || replicas > 100) {
    return res.status(400).json({ error: 'Invalid scale parameters' });
  }
  next();
};

app.get('/api/docker/containers', async (req, res) => {
  try {
    const containers = await listContainers();
    // Use Promise.allSettled to handle monitoring setup concurrently without crashing
    await Promise.allSettled(containers.map(c => monitor.startMonitoring(c.id)));

    // Enrich with smart restart meta
    const enrichedContainers = containers.map(c => {
      const tracker = restartTracker.get(c.id) || { attempts: 0, lastAttempt: 0 };
      return {
        ...c,
        metrics: monitor.getMetrics(c.id), // Include current metrics snapshot
        restartCount: tracker.attempts,
        lastRestart: tracker.lastAttempt
      };
    });

    res.json({ containers: enrichedContainers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/docker/health/:id', validateId, async (req, res) => {
  try {
    const health = await getContainerHealth(req.params.id);
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/docker/metrics/:id', validateId, (req, res) => {
  const metrics = monitor.getMetrics(req.params.id);
  res.json(metrics || { error: 'No metrics available' });
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
    return res.status(429).json({
      allowed: false,
      reason: 'Max restart attempts exceeded',
      nextRetry: new Date(tracker.lastAttempt + GRACE_PERIOD_MS)
    });
  }

  tracker.attempts++;
  tracker.lastAttempt = now;
  restartTracker.set(id, tracker);

  const result = await healer.restartContainer(id);
  res.json({ allowed: true, ...result });
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

  const result = await healer.restartContainer(id);
  res.json(result);
});

app.post('/api/docker/recreate/:id', requireDockerAuth, validateId, async (req, res) => {
  const result = await healer.recreateContainer(req.params.id);
  res.json(result);
});

app.post('/api/docker/scale/:service/:replicas', requireDockerAuth, validateScaleParams, async (req, res) => {
  const result = await healer.scaleService(req.params.service, req.params.replicas);
  res.json(result);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sentinel Backend running on http://0.0.0.0:${PORT}`);
});

// Setup WebSocket
wsBroadcaster = setupWebSocket(server);
