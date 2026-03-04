const axios = require('axios');
const { logActivity } = require('./incidents');
const { metrics } = require('../metrics/prometheus');
const { loadServicesConfig, getAllServices, getClusterIds } = require('../config/services');

let systemStatus = {
  clusters: {},
  aiAnalysis: "Waiting for AI report...",
  lastUpdated: null
};

let wsBroadcaster = null;
let servicesConfig = null;
let isChecking = false;

/**
 * Initialize system status structure for all configured clusters
 */
function initializeSystemStatus() {
  const config = loadServicesConfig();
  servicesConfig = config;
  
  systemStatus.clusters = {};
  systemStatus.lastUpdated = new Date();
  
  for (const clusterId of getClusterIds(config)) {
    systemStatus.clusters[clusterId] = {
      label: config.clusters[clusterId].label,
      region: config.clusters[clusterId].region,
      services: {}
    };
    
    const services = getAllServices(config, clusterId);
    for (const service of services) {
      systemStatus.clusters[clusterId].services[service.name] = {
        status: 'unknown',
        code: 0,
        lastUpdated: null
      };
    }
  }
  
  console.log(`Initialized monitoring for ${getClusterIds(config).length} cluster(s)`);
}

function setWsBroadcaster(broadcaster) {
  wsBroadcaster = broadcaster;
}

function getSystemStatus() {
  return systemStatus;
}

function getAllServicesInfo() {
  const config = servicesConfig || loadServicesConfig();
  const allServices = getAllServices(config);
  
  return allServices.map(service => ({
    name: service.name,
    url: service.url,
    cluster: service.cluster,
    clusterLabel: service.clusterLabel,
    region: service.region,
    ...systemStatus.clusters[service.cluster]?.services[service.name]
  }));
}

async function checkServiceHealth() {
  if (isChecking) return;
  isChecking = true;

  try {
    console.log('🔍 Checking service health...');
    const config = servicesConfig || loadServicesConfig();
    const allServices = getAllServices(config);
    let hasChanges = false;

    for (const service of allServices) {
      const clusterStatus = systemStatus.clusters[service.cluster];
      if (!clusterStatus) continue;
      
      const currentServiceStatus = clusterStatus.services[service.name];
      
      let newStatus, newCode;
      const start = Date.now();
      
      try {
        const response = await axios.get(service.url, { timeout: 30000 });
        const duration = (Date.now() - start) / 1000;
        metrics.responseTime.observe({ 
          service: service.name, 
          cluster: service.cluster,
          endpoint: service.url 
        }, duration);
        
        console.log(`✅ [${service.cluster}] ${service.name}: ${response.status}`);
        newStatus = 'healthy';
        newCode = response.status;
      } catch (error) {
        const duration = (Date.now() - start) / 1000;
        metrics.responseTime.observe({ 
          service: service.name, 
          cluster: service.cluster,
          endpoint: service.url 
        }, duration);
        
        const code = error.response?.status || 503;
        console.log(`❌ [${service.cluster}] ${service.name}: ERROR - ${error.code || error.message}`);
        newStatus = code >= 500 ? 'critical' : 'degraded';
        newCode = code;
      }

      if (
        currentServiceStatus.status !== newStatus ||
        currentServiceStatus.code !== newCode
      ) {
        const prevStatus = currentServiceStatus.status;

        // Log Status Changes
        if (newStatus === 'healthy' && prevStatus !== 'healthy' && prevStatus !== 'unknown') {
          logActivity('success', `Service ${service.name} (${service.cluster}) recovered to HEALTHY`);
        } else if (newStatus !== 'healthy' && prevStatus !== newStatus) {
          const severity = newStatus === 'critical' ? 'alert' : 'warn';
          logActivity(severity, `Service ${service.name} (${service.cluster}) is ${newStatus.toUpperCase()} (Code: ${newCode})`);
        }

        clusterStatus.services[service.name] = {
          status: newStatus,
          code: newCode,
          lastUpdated: new Date()
        };
        hasChanges = true;

        // Broadcast individual service update
        if (wsBroadcaster) {
          wsBroadcaster.broadcast('SERVICE_UPDATE', {
            name: service.name,
            cluster: service.cluster,
            ...clusterStatus.services[service.name]
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
  initializeSystemStatus();
  await checkServiceHealth();
  setInterval(checkServiceHealth, intervalMs);
}

function updateServiceStatus(serviceName, statusData, clusterId = 'local') {
  if (systemStatus.clusters[clusterId]?.services[serviceName]) {
    systemStatus.clusters[clusterId].services[serviceName] = { 
      ...systemStatus.clusters[clusterId].services[serviceName], 
      ...statusData,
      lastUpdated: new Date()
    };
  }
}

/**
 * Handle incoming metrics from remote agents
 * Remote agents POST to /api/agent/metrics with their cluster ID
 */
function handleAgentMetrics(agentData) {
  const { clusterId, services, timestamp } = agentData;
  
  if (!systemStatus.clusters[clusterId]) {
    console.warn(`Received metrics from unknown cluster: ${clusterId}`);
    return false;
  }
  
  let hasChanges = false;
  
  for (const [serviceName, statusData] of Object.entries(services)) {
    if (systemStatus.clusters[clusterId].services[serviceName]) {
      const prevStatus = systemStatus.clusters[clusterId].services[serviceName].status;
      
      systemStatus.clusters[clusterId].services[serviceName] = {
        ...statusData,
        lastUpdated: timestamp || new Date()
      };
      
      // Log status changes
      if (statusData.status !== prevStatus) {
        const severity = statusData.status === 'healthy' ? 'success' : 
          (statusData.status === 'critical' ? 'alert' : 'warn');
        logActivity(severity, `Service ${serviceName} (${clusterId} agent) is ${statusData.status}`);
      }
      
      hasChanges = true;
      
      // Broadcast individual update
      if (wsBroadcaster) {
        wsBroadcaster.broadcast('SERVICE_UPDATE', {
          name: serviceName,
          cluster: clusterId,
          ...statusData
        });
      }
    }
  }
  
  if (hasChanges) {
    systemStatus.lastUpdated = new Date();
    if (wsBroadcaster) {
      wsBroadcaster.broadcast('METRICS', systemStatus);
    }
  }
  
  return true;
}

module.exports = {
  getSystemStatus,
  getAllServicesInfo,
  startMonitoring,
  setWsBroadcaster,
  updateServiceStatus,
  checkServiceHealth,
  handleAgentMetrics,
  initializeSystemStatus
};