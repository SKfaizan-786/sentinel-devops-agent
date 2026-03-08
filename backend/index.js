// Load environment variables
require('dotenv').config();

// Validate secure secrets in production
const { validateEnvSecrets } = require('./utils/envValidator');
try {
  validateEnvSecrets();
} catch (error) {
  console.error('\n' + '='.repeat(80));
  console.error('🚨 CRITICAL SECURITY ERROR 🚨');
  console.error('='.repeat(80));
  console.error(error.message);
  console.error('='.repeat(80));
  console.error('\nApplication cannot start with insecure configuration.\n');
  console.error('Please fix the issues above and restart the application.\n');
  process.exit(1);
}

// Validate configuration and provide development warnings
const { validateConfig } = require('./config/validator');
validateConfig({ exitOnError: process.env.NODE_ENV === 'production' });

// Provide development warnings for placeholder values (non-blocking)
if (process.env.NODE_ENV !== 'production') {
  validateForDevelopment();
}
const { setupWebSocket, closeWebSocketServer } = require('./websocket');
const { closePool } = require('./db/config');
const express = require('express');
const { ERRORS } = require('./lib/errors');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const { listContainers, getContainerHealth, docker } = require('./docker/client');
const containerMonitor = require('./docker/monitor');
const healer = require('./docker/healer');
const { v4: uuidv4 } = require('uuid');
const scalingPredictor = require('./docker/scaling-predictor');
const aiService = require('./ai');
const { v4: uuidv4 } = require('uuid');
const { insertActivityLog, getActivityLogs, insertAIReport, getAIReports } = require('./db/logs');
const { routeEvent } = require('./config/notifications');
const { handleDatabaseError } = require('./utils/errorHandler');
const { validateForDevelopment } = require('./utils/envValidator');

// Hosts Routes for multi-host Docker support
const hostsRoutes = require('./routes/hosts.routes');

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
const incidentsRoutes = require('./routes/incidents.routes');
const approvalsRoutes = require('./routes/approvals.routes');
const kubernetesRoutes = require('./routes/kubernetes.routes');
const { apiLimiter } = require('./middleware/rateLimiter');
const { requireAuth, requireRole } = require('./auth/middleware');

// Distributed Traces Routes
const traceRoutes = require('./routes/traces.routes');

// Contact Routes
const contactRoutes = require('./routes/contact.routes');

// Feedback Routes - Operational Memory
const feedbackRoutes = require('./routes/feedback.routes');

// Reasoning Routes - AI Transparency
const reasoningRoutes = require('./routes/reasoning.routes');

// FinOps Routes & Collector
const finopsRoutes = require('./finops/routes');
const { startCollector: startFinOpsCollector } = require('./finops/metricsCollector');

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(metricsMiddleware); // Metrics middleware

// Rate limiters
app.use('/api', apiLimiter);

// Require authentication for feedback
app.use('/api/feedback', requireAuth, feedbackRoutes);

// Security Routes
const securityRoutes = require('./routes/security.routes');
app.use('/api/security', requireAuth, securityRoutes);
app.use(bodyParser.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));
app.use(express.urlencoded({
  extended: true,
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
})); // Handle Slack URL-encoded payloads

// RBAC Routes
app.use('/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles', rolesRoutes);
app.use('/api/incidents', incidentsRoutes);
app.use('/api/approvals', approvalsRoutes);

// Multi-host Docker Routes
app.use('/api/hosts', requireAuth, requireRole('Admin'), hostsRoutes);

// FinOps Routes
app.use('/api/finops', finopsRoutes);

// Distributed Traces Routes
app.use('/api/traces', traceRoutes);

// Contact Routes
app.use('/api', contactRoutes);

// Reasoning Routes - AI Transparency
app.use('/api/reasoning', requireAuth, reasoningRoutes);

// --- IN-MEMORY DATABASE ---
let systemStatus = {
  services: {},
  aiAnalysis: "Waiting for AI report...",
  lastUpdated: new Date()
};

let activityLog = [];
let aiLogs = [];
let nextLogId = 1;

// Expose aiLogs to route handlers (used by /api/incidents/correlated)
app.locals.aiLogs = aiLogs;

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
  insertActivityLog(type, message).catch(err => handleDatabaseError(err, 'insertActivityLog', { type, message }));

  // Broadcast the new log entry to all connected WebSocket clients
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
let isAnalyzing = false;
let needsAnotherRun = false;

/**
 * Performs root cause analysis in the background
 */
async function analyzeSystemHealth() {
  if (isAnalyzing) {
    needsAnotherRun = true;
    return;
  }

  isAnalyzing = true;
  needsAnotherRun = false;
  systemStatus.aiAnalysis = "Analyzing system health...";
  wsBroadcaster.broadcast('METRICS', systemStatus);

  try {
    const report = await aiService.performAnalysis(systemStatus.services);
    systemStatus.aiAnalysis = report;

    const insight = {
      id: Date.now(),
      timestamp: new Date(),
      analysis: report,
      summary: report
    };
    aiLogs.unshift(insight);
    if (aiLogs.length > 50) aiLogs.pop();

    // Persist to PostgreSQL (fire-and-forget)
    insertAIReport(report, report).catch(() => { });

    wsBroadcaster.broadcast('AI_ANALYSIS_COMPLETE', insight);
    wsBroadcaster.broadcast('METRICS', systemStatus);
    logActivity('info', 'AI Root Cause Analysis completed');
  } catch (error) {
    logActivity('error', `AI Analysis failed: ${error.message}`);
    systemStatus.aiAnalysis = `AI Analysis failed: ${error.message}. Please check logs.`;
    wsBroadcaster.broadcast('METRICS', systemStatus);
  } finally {
    isAnalyzing = false;
    // If state changed during analysis, run again to capture latest context
    if (needsAnotherRun) {
      setTimeout(() => analyzeSystemHealth(), 1000);
    }
  }
}

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

          // Trigger ChatOps Incident
          if (newStatus === 'critical') {
            initiateHealingProtocol({
              id: `INC-${service.name}-${Date.now()}`,
              title: `Service Failure: ${service.name}`,
              description: `Healthcheck for ${service.name} repeatedly failing with code ${newCode}.`,
              type: 'service_crash',
              severity: 'High'
            });
          }
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

      // Trigger AI Analysis in the background if there are failures
      const hasFailures = Object.values(systemStatus.services).some(s => s.status !== 'healthy');
      if (hasFailures) {
        analyzeSystemHealth().catch(err => {
          logActivity('error', `Background AI Analysis trigger failed: ${err.message}`);
        });
      }
    }
  } finally {
    isChecking = false;
  }
}

setInterval(checkServiceHealth, 10000);
checkServiceHealth();

// --- ENDPOINTS FOR FRONTEND ---

app.get('/api/status', (req, res) => {
  res.json(serviceMonitor.getSystemStatus());
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

app.post('/api/kestra-webhook', (req, res) => {
  const { aiReport, metrics } = req.body;
  const systemStatus = serviceMonitor.getSystemStatus();

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

    // Persist to PostgreSQL (fire-and-forget)
    insertAIReport(aiReport, aiReport).catch(err => handleDatabaseError(err, 'insertAIReport', { aiReport }));

    logActivity('info', 'Received new AI Analysis report');

    // Broadcast new incident/insight using dedicated AI event
    wsBroadcaster.broadcast('AI_ANALYSIS_COMPLETE', insight);

    // Call routeEvent with the incident payload for ChatOps
    initiateHealingProtocol({
      ...insight,
      title: 'Application Insight Alert',
      description: insight.summary,
      type: 'ai_insight',
      severity: 'Medium'
    });
    const newInsight = incidents.addAiLog(aiReport);

    incidents.logActivity('info', 'Received new AI Analysis report');

    if (globalWsBroadcaster) {
      globalWsBroadcaster.broadcast('AI_ANALYSIS_COMPLETE', newInsight);
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

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// --- PROMETHEUS ALERTMANAGER WEBHOOK ---
app.post('/api/webhooks/alertmanager', async (req, res) => {
  const { alerts, status: groupStatus } = req.body;
  const token = req.headers['x-sentinel-token'];
  const SECRET = process.env.ALERTMANAGER_SECRET;

  if (!SECRET) {
    console.error('[ALERTMANAGER] ERROR: ALERTMANAGER_SECRET is not set in .env. Rejecting all webhooks.');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (token !== SECRET) {
    console.error('[ALERTMANAGER] Unauthorized webhook attempt (Invalid X-Sentinel-Token)');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!alerts || !Array.isArray(alerts)) {
    return res.status(400).json({ error: 'Invalid Alertmanager payload' });
  }

  console.log(`[ALERTMANAGER] Received ${alerts.length} alerts with status: ${groupStatus}`);

  // Process alerts in the background to avoid blocking the webhook ACK
  (async () => {
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

        // Update Prometheus counters
        recordIncident({ 
          severity, 
          service: instance, 
          type: 'PROMETHEUS_ALERT' 
        });

        if (status === 'firing') {
          // Trigger "AI Investigation"
          const investigationId = uuidv4();
          const analysisText = `🔍 Sentinel AI is investigating ${alertName} on ${instance}...\n\n` +
            `Detected: ${summary}\n` +
            `Severity: ${severity.toUpperCase()}\n\n` +
            `Rule: Check logs for ${instance} and verify service health.`;
          
          const insight = {
            id: investigationId,
            timestamp: new Date(),
            type: 'PROMETHEUS_INVESTIGATION',
            alertName,
            severity,
            instance,
            summary,
            status: 'investigating',
            analysis: analysisText
          };

          // Update local state and broadcast
          aiLogs.unshift(insight);
          if (aiLogs.length > 50) aiLogs.pop();
          wsBroadcaster.broadcast('INCIDENT_NEW', insight);

          // Persist to DB using the common path
          insertAIReport(analysisText, `Investigation: ${alertName} on ${instance}`).catch(() => { });

          // Dispatch Kestra investigation (fire and forget)
          const kestraEndpoint = process.env.KESTRA_ENDPOINT || 'http://localhost:8080';
          console.log(`[AI] Dispatching investigation for ${alertName} to Kestra at ${kestraEndpoint}`);
          axios.post(`${kestraEndpoint}/api/v1/executions/sentinel/intelligent-monitor`, {
            alert: alertName,
            instance: instance,
            severity: severity,
            summary: summary
          }, { timeout: 2000 }).catch(err => {
            console.warn(`[AI] Kestra dispatch failed (is Kestra running?): ${err.message}`);
          });
        }
      } catch (err) {
        console.error(`[ALERTMANAGER] Error processing individual alert: ${err.message}`);
      }
    }
  })();

  res.json({ success: true, message: `Queued ${alerts.length} alerts for processing` });
});

app.post('/api/action/:service/:type', async (req, res) => {
  const { service, type } = req.params;
  const target = dynamicServices.find(s => s.name === service);
  
  if (!target) {
    incidents.logActivity('warn', `Failed action '${type}': Invalid service '${service}'`);
    return res.status(400).json(ERRORS.SERVICE_NOT_FOUND(service).toJSON());
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
    
    // Force a health check to update status immediately
    await checkServiceHealth();

    incidents.logActivity('success', `Successfully executed '${type}' on ${service}`);
    res.json({ success: true, message: `${type} executed on ${service}` });
  } catch (error) {
    incidents.logActivity('error', `Action '${type}' on ${service} failed: ${error.message}`);
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

// --- CHATOPS ENDPOINTS ---
const crypto = require('crypto');

// Slack request signature verification middleware
function verifySlackSignature(req, res, next) {
  const slackSignature = req.headers['x-slack-signature'];
  const slackTimestamp = req.headers['x-slack-request-timestamp'];

  if (!slackSignature || !slackTimestamp) {
    return res.status(401).json({ error: 'Verification failed - Missing headers' });
  }

  // Protect against replay attacks (5 min)
  const time = Math.floor(Date.now() / 1000);
  if (Math.abs(time - slackTimestamp) > 300) {
    return res.status(401).json({ error: 'Verification failed - Timestamp too old' });
  }

  const sigBasestring = 'v0:' + slackTimestamp + ':' + req.rawBody;
  const slackSigningSecret = process.env.SLACK_SIGNING_SECRET;

  if (!slackSigningSecret) {
    console.warn('SLACK_SIGNING_SECRET is not set. Verification bypassed.');
    return next();
  }

  const mySignature = 'v0=' + crypto.createHmac('sha256', slackSigningSecret).update(sigBasestring, 'utf8').digest('hex');

  if (crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'))) {
    next();
  } else {
    return res.status(401).json({ error: 'Verification failed - Signature mismatch' });
  }
}

app.post('/api/chatops/slack/actions', verifySlackSignature, (req, res) => {
  try {
    if (req.body && req.body.payload) {
      const payload = JSON.parse(req.body.payload);
      if (payload.type === 'block_actions') {
        const action = payload.actions[0];
        if (action && action.value) {
          const parts = action.value.split('_');
          const actionType = parts[0];
          const incidentId = parts.slice(1).join('_');

          const approval = pendingApprovals.get(incidentId);
          if (approval) {
            pendingApprovals.delete(incidentId);
            clearTimeout(approval.timeout); // Clear the auto-proceed timeout

            if (actionType === 'approve') {
              executeHealing(approval.incident);
            } else if (actionType === 'decline') {
              logActivity('warn', `Healing manually declined for incident ${incidentId}`);
            }
          } else {
            console.warn(`ChatOps: Action taken on expired or non-existent incident ${incidentId}`);
          }
        }
      }
    }
    res.status(200).send();
  } catch (e) {
    console.error(`ChatOps Action Error: ${e.message}`);
    res.status(500).json({ error: e.message });
  }
});

// --- DOCKER ENDPOINTS ---

const requireDockerAuth = (req, res, next) => {
  next();
};

app.get('/api/settings/notifications', requireAuth, (req, res) => {
  const settings = require('./config/notifications').getSettings();
  const isConfigured = (url) => !!url;
  res.json({
    slackWebhook: isConfigured(settings.slackWebhook),
    discordWebhook: isConfigured(settings.discordWebhook),
    teamsWebhook: isConfigured(settings.teamsWebhook),
    notifyOnNewIncident: settings.notifyOnNewIncident,
    notifyOnHealing: settings.notifyOnHealing
  });
});

app.post('/api/settings/notifications', requireAuth, (req, res) => {
  const { slackWebhook, discordWebhook, teamsWebhook, notifyOnNewIncident, notifyOnHealing } = req.body;

  const updates = {};
  if (slackWebhook !== undefined && typeof slackWebhook === 'string' && !slackWebhook.includes('...')) updates.slackWebhook = slackWebhook;
  if (discordWebhook !== undefined && typeof discordWebhook === 'string' && !discordWebhook.includes('...')) updates.discordWebhook = discordWebhook;
  if (teamsWebhook !== undefined && typeof teamsWebhook === 'string' && !teamsWebhook.includes('...')) updates.teamsWebhook = teamsWebhook;
  if (notifyOnNewIncident !== undefined) updates.notifyOnNewIncident = notifyOnNewIncident === true || notifyOnNewIncident === 'true';
  if (notifyOnHealing !== undefined) updates.notifyOnHealing = notifyOnHealing === true || notifyOnHealing === 'true';

  require('./config/notifications').updateSettings(updates);

  logActivity('info', 'Notification settings updated via Dashboard.');
  res.json({ success: true, message: 'Settings saved successfully' });
});

app.post('/api/settings/notifications/test', requireAuth, async (req, res) => {
  const { platform, webhookUrl } = req.body;
  const testIncident = {
    id: `MOCK-${Date.now()}`,
    title: 'Mock Sentinel Test Event',
    description: 'This is a test notification from Sentinel DevOps Agent to verify webhook configuration.',
    status: 'incident.detected',
    severity: 'Info',
    type: 'sentinel.test'
  };

  const currentSettings = require('./config/notifications').getSettings();
  const tempConfig = { ...currentSettings };

  if (typeof webhookUrl === 'string' && webhookUrl !== 'true' && !webhookUrl.includes('...')) {
    if (platform === 'slack') tempConfig.slackWebhook = webhookUrl;
    if (platform === 'discord') tempConfig.discordWebhook = webhookUrl;
    if (platform === 'teams') tempConfig.teamsWebhook = webhookUrl;
  }

  try {
    if (platform === 'slack') {
      await require('./integrations/slack').sendIncidentAlert(testIncident, tempConfig);
    } else if (platform === 'discord') {
      await require('./integrations/discord').sendIncidentAlert(testIncident, tempConfig);
    } else if (platform === 'teams') {
      await require('./integrations/teams').sendIncidentAlert(testIncident, tempConfig);
    } else {
      return res.status(400).json({ error: 'Unknown platform' });
    }
    res.json({ success: true, message: 'Test Successful' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

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

app.get('/api/docker/containers', requireAuth, async (req, res) => {
  try {
    // Support host filtering via query parameter
    const hostId = req.query.hostId || null;
    const containers = await listContainers({}, hostId);
    // Use Promise.allSettled to handle monitoring setup concurrently without crashing
    await Promise.allSettled(containers.map(c => containerMonitor.startMonitoring(c.id)));

    const enrichedContainers = containers.map(c => {
      const tracker = restartTracker.get(c.id) || { attempts: 0, lastAttempt: 0 };
      return {
        ...c,
        metrics: containerMonitor.getMetrics(c.id), // Include current metrics snapshot
        restartCount: tracker.attempts,
        lastRestart: tracker.lastAttempt
      };
    });

    // Broadcast container updates to all WebSocket clients
    wsBroadcaster.broadcast('CONTAINER_UPDATE', { containers: enrichedContainers });

    // Include host summary only for Admin users (prevents host topology leakage)
    const isAdmin = req.user?.roles?.includes('Admin');
    const hostSummary = isAdmin ? hostManager.getAll().map(h => ({
      id: h.id,
      label: h.label,
      status: h.status,
      containersRunning: h.containersRunning || 0
    })) : undefined;

    const response = { containers: enrichedContainers };
    if (hostSummary) {
      response.hosts = hostSummary;
    }

    res.json(response);
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: { code: error.code, message: error.message } });
    }
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

app.post('/api/docker/try-restart/:id', requireAuth, validateId, async (req, res) => {
  const id = req.params.id;
  const now = Date.now();
  let tracker = restartTracker.get(id) || { attempts: 0, lastAttempt: 0 };

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
  const now = Date.now();
  let tracker = restartTracker.get(id) || { attempts: 0, lastAttempt: 0 };
  tracker.lastAttempt = now;
  restartTracker.set(id, tracker);

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

app.post('/api/docker/recreate/:id', requireAuth, validateId, async (req, res) => {
  try {
    const result = await healer.recreateContainer(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

app.post('/api/docker/scale/:service/:replicas', requireAuth, validateScaleParams, async (req, res) => {
  try {
    const result = await healer.scaleService(req.params.service, req.params.replicas);
    res.json(result);
  } catch (error) {
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

app.post('/api/docker/scale-bulk', requireDockerAuth, async (req, res) => {
  try {
    const aiDecisionStr = req.body.aiDecision;
    let decisions = [];
    if (typeof aiDecisionStr === 'string') {
      try {
        const match = aiDecisionStr.match(/\[.*\]/s);
        decisions = JSON.parse(match ? match[0] : aiDecisionStr);
      } catch (e) {
        console.error('Failed to parse AI scale decisions', e);
        return res.status(400).json({ success: false, error: 'Invalid AI payload format' });
      }
    } else if (Array.isArray(aiDecisionStr)) {
      decisions = aiDecisionStr;
    } else {
      decisions = [aiDecisionStr];
    }

    const results = [];
    for (const d of decisions) {
      if (d && d.action === 'scale-out' && d.service && d.replicas) {
        logActivity('info', `Proactively scaling ${d.service} to ${d.replicas} based on AI decision`);
        const result = await healer.scaleService(d.service, d.replicas);
        results.push(result);
      }
    }
    res.json({ success: true, results });
  } catch (error) {
    console.error('Scale bulk error:', error);
    res.status(500).json(ERRORS.ACTION_FAILED().toJSON());
  }
});

// --- PREDICTION ENDPOINTS ---

app.get('/api/predictions', (req, res) => {
  const predictions = scalingPredictor.getPredictions();
  const evaluatedAt = predictions.length > 0
    ? predictions.reduce((latest, p) => p.evaluatedAt > latest ? p.evaluatedAt : latest, predictions[0].evaluatedAt)
    : new Date().toISOString();
  res.json({ predictions, evaluatedAt });
});

app.get('/api/predictions/:id', validateId, (req, res) => {
  const prediction = scalingPredictor.getPrediction(req.params.id);
  if (!prediction) {
    return res.status(404).json({ error: 'No prediction available for this container' });
  }
  res.json(prediction);
});

let globalWsBroadcaster;

const server = app.listen(PORT, '0.0.0.0', async () => {
  console.log(`🚀 Sentinel Backend running on http://0.0.0.0:${PORT}`);
  
  // Initialize multi-host Docker manager
  try {
    await hostManager.initialize();
    console.log(`🐳 Docker Host Manager initialized with ${hostManager.getConnected().length} connected host(s)`);
  } catch (err) {
    console.warn('⚠️ Docker Host Manager initialization failed:', err.message);
  }
  
  // Start FinOps metrics collector
  startFinOpsCollector();
});

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

/**
 * Graceful shutdown handler
 * @param {string} signal - The termination signal received
 */
async function gracefulShutdown(signal) {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);
  
  // Start a fail-safe timeout to prevent hanging
  const failSafeTimeout = setTimeout(() => {
    console.error('❌ Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
  
  try {
    // Stop accepting new HTTP requests
    console.log('🔄 Closing HTTP server...');
    await new Promise((resolve, reject) => {
      server.close((err) => {
        if (err) {
          console.error('❌ Error closing HTTP server:', err);
          reject(err);
        } else {
          console.log('✅ HTTP server closed successfully');
          resolve();
        }
      });
    });
    
    // Close WebSocket connections
    console.log('🔄 Closing WebSocket server...');
    await closeWebSocketServer();
    
    // Close database pool
    console.log('🔄 Closing database pool...');
    await closePool();
    
    // Clear the fail-safe timeout
    clearTimeout(failSafeTimeout);
    
    console.log('✅ Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    clearTimeout(failSafeTimeout);
    process.exit(1);
  }
}

// Attach signal listeners for graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
