// Load environment variables
require('dotenv').config();

const crypto = require('crypto');
const { setupWebSocket } = require('./websocket');
const express = require('express');
const { ERRORS } = require('./lib/errors');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { listContainers, getContainerHealth } = require('./docker/client');
const containerMonitor = require('./docker/monitor');
const healer = require('./docker/healer');
const scalingPredictor = require('./docker/scaling-predictor');
const { insertActivityLog, getActivityLogs, insertAIReport, getAIReports } = require('./db/logs');

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

// SLO Routes
const sloRoutes = require('./routes/slo.routes');

// Reasoning Routes - AI Transparency
const reasoningRoutes = require('./routes/reasoning.routes');

// FinOps Routes & Collector
const finopsRoutes = require('./finops/routes');
const { startCollector: startFinOpsCollector } = require('./finops/metricsCollector');

// Auth middleware
const { requireAuth } = require('./auth/middleware');

// Load services configuration dynamically
const {
  getAllServices: getConfiguredServices,
  getServicesByCluster,
  getServicesByRegion,
  getServicePortMap,
  getRemoteAgentConfig
} = require('./config/servicesLoader');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(metricsMiddleware);

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

// Reasoning Routes - AI Transparency
app.use('/api/reasoning', requireAuth, reasoningRoutes);

// --- IN-MEMORY DATABASE ---
// Initialize system status from configuration
const configuredServices = getConfiguredServices();

let activityLog = [];
let aiLogs = [];
let nextLogId = 1;

// WebSocket Broadcaster
let wsBroadcaster = { broadcast: () => { } };

function logActivity(type, message) {
  const entry = {
    id: nextLogId++,
    timestamp: new Date().toISOString(),
    type,
    message
  };
  activityLog.unshift(entry);
  if (activityLog.length > 100) activityLog.pop();
  console.log(`[LOG] ${type}: ${message}`);

  // Persist to PostgreSQL (fire-and-forget)
  insertActivityLog(type, message).catch(() => { });

  // Broadcast the new log entry to all connected WebSocket clients
  wsBroadcaster.broadcast('ACTIVITY_LOG', entry);
}

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

// Smart Restart Tracking
const restartTracker = new Map();
const MAX_RESTARTS = 3;
const GRACE_PERIOD_MS = 60 * 1000;

// --- ENDPOINTS FOR FRONTEND ---

// FIX: Single source of truth - always use serviceMonitor.getSystemStatus()
app.get('/api/status', (req, res) => {
  res.json(serviceMonitor.getSystemStatus());
});

app.get('/api/services', (req, res) => {
  res.json({ services: serviceMonitor.getAllServicesInfo() });
});

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

  // SECURITY FIX: Fail closed when secret is not configured
  if (!AGENT_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Agent authentication not configured' });
  }

  if (!agentSecret || agentSecret !== AGENT_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Unauthorized: Invalid agent secret' });
  }

  next();
}

app.post('/api/agent/metrics', verifyAgentAuth, (req, res) => {
  const { clusterId, services: svcData, timestamp } = req.body;

  if (!clusterId || !svcData) {
    return res.status(400).json({ error: 'Missing required fields: clusterId, services' });
  }

  const success = serviceMonitor.handleAgentMetrics({
    clusterId,
    services: svcData,
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
  // FIX: Use serviceMonitor as single source of truth
  const systemStatus = serviceMonitor.getSystemStatus();

  if (aiReport) {
    systemStatus.aiAnalysis = aiReport;
    const insight = incidents.addAiLog(aiReport);

    incidents.logActivity('info', 'Received new AI Analysis report');

    // Persist to PostgreSQL (fire-and-forget)
    insertAIReport(aiReport, aiReport).catch(() => { });

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
  // Use dynamic service port mapping from configuration
  // FIX: Resolve full qualified key (cluster:name) for port map lookup
  const servicePortMap = getServicePortMap();
  const serviceConfig = services.find(s => s.name === service);
  const qualifiedKey = serviceConfig ? `${serviceConfig.cluster}:${service}` : service;
  const port = servicePortMap[qualifiedKey];

  incidents.logActivity('info', `Triggering action '${type}' on service '${service}'`);

  if (!port) {
    incidents.logActivity('warn', `Failed action '${type}': Invalid service '${service}'`);
    return res.status(400).json({ success: false, error: 'Invalid service' });
  }

  const serviceUrl = serviceConfig ? new URL(serviceConfig.url).origin : `http://localhost:${port}`;

  try {
    let mode = 'healthy';
    if (type === 'crash' || type === 'down') mode = 'down';
    if (type === 'degraded') mode = 'degraded';
    if (type === 'slow') mode = 'slow';

    await axios.post(`${serviceUrl}/simulate/${mode}`, {}, { timeout: 5000 });
    // Force a health check to update status immediately
    await serviceMonitor.checkServiceHealth();

    incidents.logActivity('success', `Successfully executed '${type}' on ${service}`);
    res.json({ success: true, message: `${type} executed on ${service}` });
  } catch (error) {
    incidents.logActivity('error', `Action '${type}' on ${service} failed: ${error.message}`);
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- DOCKER ENDPOINTS ---

const requireDockerAuth = (req, res, next) => {
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

    const enrichedContainers = containers.map(c => {
      const tracker = restartTracker.get(c.id) || { attempts: 0, lastAttempt: 0 };
      return {
        ...c,
        metrics: containerMonitor.getMetrics(c.id),
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
  const id = req.params.id;
  try {
    const result = await healer.restartContainer(id);

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
 * Protected by enabled check and webhook secret verification
 */
app.post('/api/remote-agent/report', (req, res) => {
  const remoteAgentConfig = getRemoteAgentConfig();

  // SECURITY FIX: Check if remote agents are enabled
  if (!remoteAgentConfig.enabled) {
    return res.status(404).json({ error: 'Remote agents are disabled' });
  }

  // SECURITY FIX: Require webhook secret to be configured
  if (!remoteAgentConfig.webhookSecret) {
    return res.status(500).json({ error: 'Remote agent webhook secret not configured' });
  }

  // Verify webhook secret signature
  const signature = req.headers['x-sentinel-signature'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing signature header' });
  }

  const hmac = crypto.createHmac('sha256', remoteAgentConfig.webhookSecret);
  // Use raw body for HMAC verification to ensure consistency
  const bodyToVerify = req.rawBody || JSON.stringify(req.body);
  hmac.update(bodyToVerify);
  const expectedSignature = 'sha256=' + hmac.digest('hex');

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  if (signatureBuffer.length !== expectedBuffer.length) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { type, clusterId, clusterName, region, services: reportedServices } = req.body;

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
});

let globalWsBroadcaster;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sentinel Backend running on http://0.0.0.0:${PORT}`);
  // Start FinOps metrics collector
  startFinOpsCollector();
});

// Setup WebSocket
globalWsBroadcaster = setupWebSocket(server);
wsBroadcaster = globalWsBroadcaster;
serviceMonitor.setWsBroadcaster(globalWsBroadcaster);

// Initialize Predictive Scaling Engine
scalingPredictor.init(containerMonitor, globalWsBroadcaster);

// React to scale recommendations
scalingPredictor.on('scale-recommendation', (prediction) => {
  logActivity('alert', `🔮 Scale Alert: ${prediction.containerName} at ${Math.round(prediction.failureProbability * 100)}% failure risk — Recommendation: ${prediction.recommendation}`);
});

// Listen for container predictions
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

// Initialize monitoring on startup
containerMonitor.init();

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

// Start watching default namespace by default
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
startCollectors();
