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

// Service configuration
// Using localhost for local execution
const services = [
  { name: 'auth', url: 'http://localhost:3001/health' },
  { name: 'payment', url: 'http://localhost:3002/health' },
  { name: 'notification', url: 'http://localhost:3003/health' }
];

// Continuous health checking (every 5 seconds)
async function checkServiceHealth() {
  console.log('🔍 Checking service health...');

  for (const service of services) {
    try {
      const response = await axios.get(service.url, { timeout: 30000 });
      console.log(`✅ ${service.name}: ${response.status} - ${response.data.status}`);
      systemStatus.services[service.name] = {
        status: 'healthy',
        code: response.status,
        lastUpdated: new Date()
      };
    } catch (error) {
      const code = error.response?.status || 503;
      console.log(`❌ ${service.name}: ERROR - ${error.code || error.message}`);

      const status = code >= 500 ? 'critical' : 'degraded';
      systemStatus.services[service.name] = {
        status: status,
        code: code,
        lastUpdated: new Date()
      };

      // Log the failure (both critical and degraded)
      const lastLog = activityLog[0];
      const statusText = code >= 500 ? 'DOWN' : 'DEGRADED';
      const isDuplicate = lastLog &&
        lastLog.message.includes(service.name.toUpperCase()) &&
        lastLog.message.includes(statusText);

      if (!isDuplicate) {
        activityLog.unshift({
          id: Date.now(),
          message: code >= 500
            ? `${service.name.toUpperCase()} service is DOWN (HTTP ${code})`
            : `${service.name.toUpperCase()} service is DEGRADED (HTTP ${code})`,
          type: 'alert',
          severity: code >= 500 ? 'critical' : 'warning',
          timestamp: new Date()
        });
        if (activityLog.length > 50) activityLog.splice(50);
      }
    }
  }
  systemStatus.lastUpdated = new Date();
}

// Start continuous health monitoring
setInterval(checkServiceHealth, 5000);
checkServiceHealth(); // Initial check

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

// --- WEBHOOK FOR KESTRA ---

app.post('/api/kestra-webhook', (req, res) => {
  const { aiReport, metrics } = req.body;
  console.log('📦 Received update from Kestra:', aiReport);

  if (aiReport) {
    systemStatus.aiAnalysis = aiReport;
  }
  systemStatus.lastUpdated = new Date();

  // Parse Metrics Update
  if (metrics) {
    Object.keys(metrics).forEach(serviceName => {
      if (systemStatus.services[serviceName]) {
        systemStatus.services[serviceName].code = metrics[serviceName].code || 0;
        const code = metrics[serviceName].code;
        systemStatus.services[serviceName].status =
          code >= 200 && code < 300 ? 'healthy' :
            code >= 500 ? 'critical' : 'degraded';
        systemStatus.services[serviceName].lastUpdated = new Date();
      }
    });
  }

  aiLogs.unshift({
    id: Date.now(),
    analysis: aiReport,
    metrics: metrics,
    summary: aiReport,
    timestamp: new Date()
  });
  if (aiLogs.length > 20) aiLogs.splice(20);

  if (aiReport && !aiReport.includes("HEALTHY")) {
    activityLog.unshift({
      id: Date.now(),
      message: aiReport,
      type: 'alert',
      severity: aiReport.includes('CRITICAL') ? 'critical' : 'warning',
      timestamp: new Date()
    });
    if (activityLog.length > 50) activityLog.splice(50);
  }

  res.json({ success: true });
});

app.post('/api/kestra/events', (req, res) => {
  const { services, ai, timestamp } = req.body;
  console.log('📊 Kestra event received:', ai);
  activityLog.unshift({
    id: Date.now(),
    message: `Kestra Analysis: ${ai}`,
    type: 'info',
    severity: 'info',
    timestamp: new Date(timestamp || Date.now())
  });
  if (activityLog.length > 50) activityLog.splice(50);
  res.json({ success: true });
});

app.post('/api/action/:service/:type', async (req, res) => {
  const { service, type } = req.params;
  const serviceMap = { 'auth': 3001, 'payment': 3002, 'notification': 3003 };
  const port = serviceMap[service];

  if (!port) return res.status(400).json({ success: false, error: 'Invalid service' });

  try {
    let mode = 'healthy';
    if (type === 'restart' || type === 'heal') mode = 'healthy';
    if (type === 'crash' || type === 'down') mode = 'down';
    if (type === 'degraded') mode = 'degraded';
    if (type === 'slow') mode = 'slow';

    await axios.post(`http://localhost:${port}/simulate/${mode}`, {}, { timeout: 5000 });

    activityLog.unshift({
      id: Date.now(),
      message: `Manual action: ${type} executed on ${service} service`,
      type: 'action',
      severity: 'info',
      timestamp: new Date()
    });

    res.json({ success: true, message: `${type} executed on ${service}` });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- DOCKER ENDPOINTS ---

app.get('/api/docker/containers', async (req, res) => {
  try {
    const containers = await listContainers();
    // Start monitoring all discovered containers
    containers.forEach(c => monitor.startMonitoring(c.id));
    res.json({ containers });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/docker/health/:id', async (req, res) => {
  try {
    const health = await getContainerHealth(req.params.id);
    res.json(health);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/docker/metrics/:id', (req, res) => {
  const metrics = monitor.getMetrics(req.params.id);
  res.json(metrics || { error: 'No metrics available' });
});

app.post('/api/docker/restart/:id', async (req, res) => {
  const result = await healer.restartContainer(req.params.id);
  res.json(result);
});

app.post('/api/docker/recreate/:id', async (req, res) => {
  const result = await healer.recreateContainer(req.params.id);
  res.json(result);
});

app.post('/api/docker/scale/:service/:replicas', async (req, res) => {
  const result = await healer.scaleService(req.params.service, req.params.replicas);
  res.json(result);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sentinel Backend running on http://0.0.0.0:${PORT}`);
  console.log(`🔍 Continuous health monitoring active (5s intervals)`);
});
