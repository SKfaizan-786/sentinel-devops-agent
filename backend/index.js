const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { listContainers, getContainerHealth } = require('./docker/client');
const monitor = require('./docker/monitor');
const healer = require('./docker/healer');

const app = express();
const PORT = 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

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
async function checkServiceHealth() {
  console.log('🔍 Checking service health...');

  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 30000 });
      // console.log(`✅ ${service.name}: ${response.status} - ${response.data.status}`);

      const prevStatus = systemStatus.services[service.name].status;
      if (prevStatus !== 'healthy' && prevStatus !== 'unknown') {
        logActivity('success', `Service ${service.name} recovered to HEALTHY`);
      }

      systemStatus.services[service.name] = {
        status: 'healthy',
        code: response.status,
        lastUpdated: new Date()
      };
    } catch (error) {
      const code = error.response?.status || 503;
      // console.log(`❌ ${service.name}: ERROR - ${error.code || error.message}`);

      const status = code >= 500 ? 'critical' : 'degraded';
      const prevStatus = systemStatus.services[service.name].status;

      if (prevStatus !== status) {
        logActivity(status === 'critical' ? 'alert' : 'warn', `Service ${service.name} is ${status.toUpperCase()} (Code: ${code})`);
      }

      systemStatus.services[service.name] = {
        status: status,
        code: code,
        lastUpdated: new Date()
      };
    }
  }
  systemStatus.lastUpdated = new Date();
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
    logActivity('info', 'Received new AI Analysis report');
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
  }
  res.json({ success: true });
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
    logActivity('success', `Successfully executed '${type}' on ${service}`);
    res.json({ success: true, message: `${type} executed on ${service}` });
  } catch (error) {
    logActivity('error', `Action '${type}' on ${service} failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- DOCKER ENDPOINTS ---

// Middleware for ID/Service validation and Auth (mock auth)
const requireAuth = (req, res, next) => {
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

app.post('/api/docker/try-restart/:id', requireAuth, validateId, async (req, res) => {
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

app.post('/api/docker/restart/:id', requireAuth, validateId, async (req, res) => {
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

app.post('/api/docker/recreate/:id', requireAuth, validateId, async (req, res) => {
  const result = await healer.recreateContainer(req.params.id);
  res.json(result);
});

app.post('/api/docker/scale/:service/:replicas', requireAuth, validateScaleParams, async (req, res) => {
  const result = await healer.scaleService(req.params.service, req.params.replicas);
  res.json(result);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sentinel Backend running on http://0.0.0.0:${PORT}`);
});
