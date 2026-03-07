const axios = require('axios');
const { logActivity } = require('./incidents');
const { metrics } = require('../metrics/prometheus');
const { 
  getAllServices,
  getServicesByCluster,
  getServicesByRegion,
  loadServicesConfig 
} = require('../config/servicesLoader');

let wsBroadcaster = null;
let isChecking = false;

// Load services dynamically from configuration
const configuredServices = getAllServices();

// Initialize system status from configuration
function initializeSystemStatus() {
  const svcMap = {};
  for (const svc of configuredServices) {
    const serviceKey = `${svc.cluster}:${svc.name}`;
    svcMap[serviceKey] = { 
      status: 'unknown', 
      code: 0, 
      lastUpdated: null,
      cluster: svc.cluster,
      clusterName: svc.clusterName,
      region: svc.region
    };
  }
  systemStatus = {
    services: svcMap,
    clusters: getServicesByCluster(),
    aiAnalysis: "Waiting for AI report...",
    lastUpdated: new Date()
  };
  console.log(`Initialized monitoring for ${Object.keys(getServicesByCluster()).length} cluster(s)`);
  return systemStatus;
}

let systemStatus = initializeSystemStatus();

// Get flat services array from configuration
const services = configuredServices.map(s => ({
  name: s.name,
  url: s.url,
  type: s.type,
  cluster: s.cluster,
  clusterName: s.clusterName,
  region: s.region,
  port: s.port
}));

function setWsBroadcaster(broadcaster) {
  wsBroadcaster = broadcaster;
}

function getSystemStatus() {
  return systemStatus;
}

function getAllServicesInfo() {
  return configuredServices.map(service => {
    const serviceKey = `${service.cluster}:${service.name}`;
    return {
      name: service.name,
      url: service.url,
      cluster: service.cluster,
      clusterName: service.clusterName,
      region: service.region,
      ...systemStatus.services[serviceKey]
    };
  });
}

async function checkServiceHealth() {
  if (isChecking) return;
  isChecking = true;

  try {
    console.log('🔍 Checking service health...');
    let hasChanges = false;

    for (const service of configuredServices) {
      const serviceKey = `${service.cluster}:${service.name}`;
      const currentServiceStatus = systemStatus.services[serviceKey];
      if (!currentServiceStatus) continue;
      
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

        systemStatus.services[serviceKey] = {
          ...systemStatus.services[serviceKey],
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
            ...systemStatus.services[serviceKey]
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
  const serviceKey = `${clusterId}:${serviceName}`;
  if (systemStatus.services[serviceKey]) {
    systemStatus.services[serviceKey] = { 
      ...systemStatus.services[serviceKey], 
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
  const { clusterId, services: agentServices, timestamp } = agentData;
  
  let hasChanges = false;
  
  for (const [serviceName, statusData] of Object.entries(agentServices)) {
    const serviceKey = `${clusterId}:${serviceName}`;
    
    if (!systemStatus.services[serviceKey]) {
      // Auto-register unknown remote services
      systemStatus.services[serviceKey] = {
        status: 'unknown',
        code: 0,
        lastUpdated: null,
        cluster: clusterId,
        clusterName: clusterId,
        region: 'remote'
      };
    }
    
    const prevStatus = systemStatus.services[serviceKey].status;
    
    systemStatus.services[serviceKey] = {
      ...systemStatus.services[serviceKey],
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
  
  if (hasChanges) {
    systemStatus.lastUpdated = new Date();
    if (wsBroadcaster) {
      wsBroadcaster.broadcast('METRICS', systemStatus);
    }
  }
  
  return true;
}

/**
 * Get services grouped by cluster with current status
 * @returns {Object} Clusters with service status
 */
function getServicesGroupedByCluster() {
    const clusters = {};
    
    // Add static services from configuration
    for (const service of services) {
        const clusterId = service.cluster || 'default';
        const serviceKey = `${clusterId}:${service.name}`;
        if (!clusters[clusterId]) {
            clusters[clusterId] = {
                id: clusterId,
                name: service.clusterName || clusterId,
                region: service.region || 'default',
                services: []
            };
        }
        clusters[clusterId].services.push({
            ...service,
            ...systemStatus.services[serviceKey]
        });
    }
    
    // Add remote agent services not in static config
    for (const [key, data] of Object.entries(systemStatus.services)) {
        if (key.includes(':')) {
            const existsInStatic = services.some(s => `${s.cluster}:${s.name}` === key);
            if (existsInStatic) continue;
            
            const cluster = data.cluster || 'remote';
            if (!clusters[cluster]) {
                clusters[cluster] = {
                    id: cluster,
                    name: data.clusterName || cluster,
                    region: data.region || 'remote',
                    services: []
                };
            }
            clusters[cluster].services.push({ 
                name: key,
                ...data 
            });
        }
    }
    
    return clusters;
}

/**
 * Get services grouped by region with current status
 * @returns {Object} Regions with service status
 */
function getServicesGroupedByRegion() {
    const regions = {};
    
    // Add static services from configuration
    for (const service of services) {
        const regionId = service.region || 'default';
        const serviceKey = `${service.cluster}:${service.name}`;
        if (!regions[regionId]) {
            regions[regionId] = {
                region: regionId,
                services: []
            };
        }
        regions[regionId].services.push({
            ...service,
            ...systemStatus.services[serviceKey]
        });
    }
    
    // Add remote agent services not in static config
    for (const [key, data] of Object.entries(systemStatus.services)) {
        if (key.includes(':')) {
            const existsInStatic = services.some(s => `${s.cluster}:${s.name}` === key);
            if (existsInStatic) continue;
            
            const regionId = data.region || 'remote';
            if (!regions[regionId]) {
                regions[regionId] = {
                    region: regionId,
                    services: []
                };
            }
            regions[regionId].services.push({
                name: key,
                ...data
            });
        }
    }
    
    return regions;
}

/**
 * Update service status from remote agent report
 * 
 * Remote agent services use namespaced keys: `${clusterId}:${serviceName}`
 * to prevent collisions across clusters.
 * 
 * @param {Object} report - Remote agent health report
 */
function handleRemoteAgentReport(report) {
    const { clusterId, clusterName, region, services: reportedServices } = report;
    
    for (const [serviceName, serviceData] of Object.entries(reportedServices)) {
        const serviceKey = `${clusterId}:${serviceName}`;
        
        // Initialize if not exists
        if (!systemStatus.services[serviceKey]) {
            systemStatus.services[serviceKey] = {
                status: 'unknown',
                code: 0,
                lastUpdated: null,
                cluster: clusterId,
                clusterName: clusterName,
                region: region
            };
        }
        
        const prevStatus = systemStatus.services[serviceKey].status;
        const newStatus = String(serviceData.status || 'unknown');
        
        // Log status changes
        if (newStatus === 'healthy' && prevStatus !== 'healthy' && prevStatus !== 'unknown') {
            logActivity('success', `[${clusterId}] Service ${serviceName} recovered to HEALTHY`);
        } else if (newStatus !== 'healthy' && prevStatus !== newStatus) {
            const severity = newStatus === 'critical' ? 'alert' : 'warn';
            logActivity(severity, `[${clusterId}] Service ${serviceName} is ${newStatus.toUpperCase()}`);
        }
        
        systemStatus.services[serviceKey] = {
            ...systemStatus.services[serviceKey],
            status: newStatus,
            code: serviceData.code,
            latencyMs: serviceData.latencyMs,
            lastUpdated: new Date(serviceData.lastUpdated || Date.now())
        };
    }
    
    systemStatus.lastUpdated = new Date();
    
    // Broadcast update
    if (wsBroadcaster) {
        wsBroadcaster.broadcast('METRICS', systemStatus);
    }
}

module.exports = {
  getSystemStatus,
  getAllServicesInfo,
  startMonitoring,
  setWsBroadcaster,
  updateServiceStatus,
  checkServiceHealth,
  handleAgentMetrics,
  initializeSystemStatus,
  getServicesGroupedByCluster,
  getServicesGroupedByRegion,
  handleRemoteAgentReport
};
