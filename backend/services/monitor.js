const axios = require('axios');
const { logActivity } = require('./incidents');
// Need to require metrics, but allow for circular dependency if metrics/collectors imports monitor.
// Currently collectors.js imports monitor.js. So monitor.js importing collectors.js (where metrics might be managed?) is bad.
// But metrics/prometheus.js is separate. We can import that safely.
const { metrics } = require('../metrics/prometheus');

let systemStatus = {
  services: {
    auth: { status: 'unknown', code: 0, lastUpdated: null },
    payment: { status: 'unknown', code: 0, lastUpdated: null },
    notification: { status: 'unknown', code: 0, lastUpdated: null }
  },
  aiAnalysis: "Waiting for AI report...",
  lastUpdated: new Date()
};

const services = [
  { name: 'auth', url: 'http://localhost:3001/health' },
  { name: 'payment', url: 'http://localhost:3002/health' },
  { name: 'notification', url: 'http://localhost:3003/health' }
];

let wsBroadcaster = null;

function setWsBroadcaster(broadcaster) {
    wsBroadcaster = broadcaster;
}

function getSystemStatus() {
    return systemStatus;
}

function getAllServices() {
    return services.map(s => ({
        ...s,
        ...systemStatus.services[s.name]
    }));
}

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
      const start = Date.now();
      try {
        const response = await axios.get(service.url, { timeout: 30000 });
        const duration = (Date.now() - start) / 1000;
        metrics.responseTime.observe({ service: service.name, endpoint: service.url }, duration);
        console.log(`✅ ${service.name}: ${response.status} - ${response.data.status}`);
        newStatus = 'healthy';
        newCode = response.status;
      } catch (error) {
        const duration = (Date.now() - start) / 1000;
        metrics.responseTime.observe({ service: service.name, endpoint: service.url }, duration);
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
        if (wsBroadcaster) {
            wsBroadcaster.broadcast('SERVICE_UPDATE', {
              name: service.name,
              ...systemStatus.services[service.name]
            });
        }
      }
    }

    if (hasChanges) {
      systemStatus.lastUpdated = new Date();
      // Broadcast full metrics update
      if (wsBroadcaster) {
        wsBroadcaster.broadcast('METRICS', systemStatus);
      }
    }
  } finally {
    isChecking = false;
  }
}

async function startMonitoring(intervalMs = 5000) {
    await checkServiceHealth();
    setInterval(checkServiceHealth, intervalMs);
}

function updateServiceStatus(serviceName, statusData) {
    if (systemStatus.services[serviceName]) {
        systemStatus.services[serviceName] = { 
            ...systemStatus.services[serviceName], 
            ...statusData,
            lastUpdated: new Date()
        };
        // Should we broadcast here? Typically updates come from polling or webhook.
    }
}

module.exports = {
  getSystemStatus,
  getAllServices,
  startMonitoring,
  setWsBroadcaster,
  updateServiceStatus,
  checkServiceHealth // Export for manual triggering
};
