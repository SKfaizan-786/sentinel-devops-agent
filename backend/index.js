// Load environment variables
require('dotenv').config();

const { setupWebSocket } = require('./websocket');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { listContainers, getContainerHealth, docker } = require('./docker/client');
const monitor = require('./docker/monitor');
const healer = require('./docker/healer');
const { v4: uuidv4 } = require('uuid');
const { insertActivityLog, getActivityLogs, insertAIReport, getAIReports } = require('./db/logs');

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
  services: {},
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
  if (activityLog.length > 100) activityLog.pop(); // Keep last 100 in memory
  console.log(`[LOG] ${type}: ${message}`);

  // Persist to PostgreSQL (fire-and-forget)
  insertActivityLog(type, message).catch(() => { });

  // Broadcast the new log entry
  wsBroadcaster.broadcast('ACTIVITY_LOG', entry);
}

// WebSocket Broadcaster
let wsBroadcaster = { broadcast: () => { } };

// Dynamic Services State
let dynamicServices = [];

async function refreshDynamicServices() {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: { label: ['sentinel.monitor=true'] }
    });

    const newServices = containers.map(container => {
      const name = container.Names[0].replace('/', '');
      // Try to get external URL from label, fallback to guessing or internal
      const urlLabel = container.Labels['sentinel.url'];
      const url = urlLabel || `http://localhost:${container.Ports[0]?.PublicPort || 80}/health`;
      
      return { name, url, id: container.Id };
    });

    // Detect if services list changed
    const currentNames = dynamicServices.map(s => s.name).sort();
    const newNames = newServices.map(s => s.name).sort();

    if (JSON.stringify(currentNames) !== JSON.stringify(newNames)) {
      console.log(`📡 Dynamic Discovery: Found ${newServices.length} monitored services`);
      
      // Update systemStatus with new keys if they don't exist
      newServices.forEach(s => {
        if (!systemStatus.services[s.name]) {
          systemStatus.services[s.name] = { status: 'unknown', code: 0, lastUpdated: null };
          logActivity('info', `New service discovered: ${s.name}`);
        }
      });

      // Remove services that are gone
      Object.keys(systemStatus.services).forEach(name => {
        if (!newServices.find(s => s.name === name)) {
          delete systemStatus.services[name];
          logActivity('warn', `Service removed: ${name}`);
        }
      });

      dynamicServices = newServices;
      wsBroadcaster.broadcast('SERVICES_DISCOVERED', dynamicServices);
    }
  } catch (error) {
    console.error('❌ Dynamic Discovery Error:', error);
  }
}

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
    await refreshDynamicServices();
    
    if (dynamicServices.length === 0) {
      console.log('--- No services found to monitor (add sentinel.monitor=true label) ---');
      return;
    }

    console.log(`🔍 Checking ${dynamicServices.length} services...`);
    let hasChanges = false;

    for (const service of dynamicServices) {
      let newStatus, newCode;
      try {
        const response = await axios.get(service.url, { timeout: 30000 });
        newStatus = 'healthy';
        newCode = response.status;
      } catch (error) {
        const code = error.response?.status || 503;
        newStatus = code >= 500 ? 'critical' : 'degraded';
        newCode = code;
      }

      const current = systemStatus.services[service.name];
      if (current.status !== newStatus || current.code !== newCode) {
        const prevStatus = current.status;

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

setInterval(checkServiceHealth, 10000);
checkServiceHealth();

// --- ENDPOINTS FOR FRONTEND ---

app.get('/api/status', (req, res) => {
  res.json(systemStatus);
});

app.get('/api/activity', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 50, 200);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const { logs, total } = await getActivityLogs(limit, offset);
    res.json({ activity: logs, total, limit, offset });
  } catch (err) {
    res.json({ activity: activityLog.slice(offset, offset + limit) });
  }
});

app.get('/api/insights', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  const offset = parseInt(req.query.offset) || 0;
  try {
    const { reports, total } = await getAIReports(limit, offset);
    res.json({ insights: reports, total, limit, offset });
  } catch (err) {
    res.json({ insights: aiLogs.slice(offset, offset + limit) });
  }
});

app.post('/api/kestra-webhook', (req, res) => {
  const { aiReport, metrics } = req.body;
  if (aiReport) {
    systemStatus.aiAnalysis = aiReport;
    const insight = {
      id: uuidv4(),
      timestamp: new Date(),
      analysis: aiReport,
      summary: aiReport
    };
    aiLogs.unshift(insight);
    if (aiLogs.length > 50) aiLogs.pop();

    // Persist to DB
    insertAIReport(aiReport, aiReport).catch(() => {});

    logActivity('info', 'Received new AI Analysis report');
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
    wsBroadcaster.broadcast('METRICS', systemStatus);
  }
  res.json({ success: true });
});

app.post('/api/action/:service/:type', async (req, res) => {
  const { service, type } = req.params;
  const target = dynamicServices.find(s => s.name === service);
  
  if (!target) {
    logActivity('warn', `Failed action '${type}': Invalid service '${service}'`);
    return res.status(400).json({ success: false, error: 'Invalid service' });
  }

  logActivity('info', `Triggering action '${type}' on service '${service}'`);

  try {
    let mode = 'healthy';
    if (type === 'crash' || type === 'down') mode = 'down';
    if (type === 'degraded') mode = 'degraded';
    if (type === 'slow') mode = 'slow';

    // Guess target port based on discovered URL or default simulator pattern
    const urlObj = new URL(target.url);
    await axios.post(`http://${urlObj.hostname}:${urlObj.port}/simulate/${mode}`, {}, { timeout: 5000 });
    
    await checkServiceHealth();

    logActivity('success', `Successfully executed '${type}' on ${service}`);
    res.json({ success: true, message: `${type} executed on ${service}` });
  } catch (error) {
    logActivity('error', `Action '${type}' on ${service} failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- DOCKER ENDPOINTS ---

const requireDockerAuth = (req, res, next) => {
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
    await Promise.allSettled(containers.map(c => monitor.startMonitoring(c.id)));

    const enrichedContainers = containers.map(c => {
      const tracker = restartTracker.get(c.id) || { attempts: 0, lastAttempt: 0 };
      return {
        ...c,
        metrics: monitor.getMetrics(c.id),
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
  const id = req.params.id;
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
