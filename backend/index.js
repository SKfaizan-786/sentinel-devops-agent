require('dotenv').config();

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');

const { listContainers } = require('./docker/client');
const monitor = require('./docker/monitor');
const healer = require('./docker/healer');
const supervisor = require('./docker/supervisor');
const { setupWebSocket } = require('./websocket');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());

/* ===============================
   SYSTEM STATE
================================= */

let wsBroadcaster = { broadcast: () => {} };

/* ===============================
   RESTART + SCALING CONFIG
================================= */

const restartTracker = new Map();
const cooldownTracker = new Map();
const scaleTracker = new Map();

const MAX_RESTARTS = 3;
const GRACE_PERIOD_MS = 60 * 1000;
const COOLDOWN_AFTER_RECREATE_MS = 2 * 60 * 1000;

const SCALE_UP_CPU_THRESHOLD = 80;
const SCALE_DOWN_CPU_THRESHOLD = 25;

const MAX_REPLICAS = 5;
const MIN_REPLICAS = 1;
const SCALE_COOLDOWN_MS = 2 * 60 * 1000;

/* ===============================
   SCALING LOGIC
================================= */

async function autoScaleIfNeeded(container, cpuUsage) {
  const serviceName = container.name;
  const lastScale = scaleTracker.get(serviceName) || 0;

  if (Date.now() - lastScale < SCALE_COOLDOWN_MS) return;

  const allContainers = await listContainers();
  const sameService = allContainers.filter(c => c.name === serviceName);
  const currentReplicas = sameService.length;

  // SCALE UP
  if (cpuUsage > SCALE_UP_CPU_THRESHOLD && currentReplicas < MAX_REPLICAS) {
    console.log(`📈 Scaling UP ${serviceName} (CPU ${cpuUsage}%)`);
    await healer.scaleService(serviceName, currentReplicas + 1);
    scaleTracker.set(serviceName, Date.now());
    return;
  }

  // SCALE DOWN
  if (cpuUsage < SCALE_DOWN_CPU_THRESHOLD && currentReplicas > MIN_REPLICAS) {
    console.log(`📉 Scaling DOWN ${serviceName} (CPU ${cpuUsage}%)`);
    await healer.scaleService(serviceName, currentReplicas - 1);
    scaleTracker.set(serviceName, Date.now());
  }
}

/* ===============================
   BACKGROUND MONITOR LOOP
================================= */
function computeRiskScore(container, metrics, restartAttempts) {

  let score = 0;

  const cpu = parseFloat(metrics.cpu) || 0;
  const memory = parseFloat(metrics.memory?.percent) || 0;

  // CPU contributes max 30 points
  score += Math.min(cpu * 0.3, 30);

  // Memory contributes max 25 points
  score += Math.min(memory * 0.25, 25);

  // Restart frequency contributes max 25 points
  score += Math.min(restartAttempts * 8, 25);

  // Health contributes 20 points
  if (container.health === 'unhealthy') {
    score += 20;
  }

  return Math.min(Math.round(score), 100);
}
setInterval(async () => {
  try {
    const containers = await listContainers();

    for (const c of containers) {

      try {

        // Skip if in recreate cooldown
        const cooldownUntil = cooldownTracker.get(c.id);
        if (cooldownUntil && Date.now() < cooldownUntil) {
          continue;
        }

        // Ensure monitoring is active
        await monitor.startMonitoring(c.id);

        const metrics = monitor.getMetrics(c.id);
        if (!metrics) continue;

        const cpuUsage = parseFloat(metrics.cpu) || 0;

        const id = c.id;
        const now = Date.now();
        let tracker = restartTracker.get(id) || { attempts: 0, lastAttempt: 0 };
        const riskScore = computeRiskScore(c, metrics, tracker.attempts);

console.log(`📊 ${c.name} Risk Score: ${riskScore}`);

if (riskScore >= 80) {

  console.log(`🚨 CRITICAL risk for ${c.name}`);

  if (tracker.attempts < MAX_RESTARTS) {

    tracker.attempts++;
    tracker.lastAttempt = now;
    restartTracker.set(id, tracker);

    await healer.restartContainer(id);

  } else {

    monitor.stopMonitoring(id);
    restartTracker.delete(id);

    await healer.recreateContainer(id);

    cooldownTracker.set(id, Date.now() + COOLDOWN_AFTER_RECREATE_MS);
  }

  continue;
}

if (riskScore >= 60) {

  console.log(`⚠️ WARNING risk for ${c.name}`);

  await autoScaleIfNeeded(c, cpuUsage);
}
        // Reset restart counter after grace period
        if (now - tracker.lastAttempt > GRACE_PERIOD_MS) {
          tracker.attempts = 0;
        }

        /* ===============================
           1️⃣ UNHEALTHY → RESTART / RECREATE
        ================================= */

        

        /* ===============================
           2️⃣ HIGH CPU → SCALE
        ================================= */

        if (cpuUsage > SCALE_UP_CPU_THRESHOLD) {
          await autoScaleIfNeeded(c, cpuUsage);
        }

      } catch (innerErr) {

        if (innerErr.statusCode === 404) continue;

        console.error("Container loop error:", innerErr.message);
      }
    }

  } catch (err) {
    console.error("Background monitor error:", err.message);
  }

}, 5000);

/* ===============================
   BASIC API ROUTE
================================= */

app.get('/api/docker/containers', async (req, res) => {
  try {
    const containers = await listContainers();

    const enriched = containers.map(c => ({
      ...c,
      metrics: monitor.getMetrics(c.id)
    }));

    res.json({ containers: enriched });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   SERVER START
================================= */

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Sentinel Backend running on http://0.0.0.0:${PORT}`);
});

supervisor.start();
wsBroadcaster = setupWebSocket(server);