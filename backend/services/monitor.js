const axios = require('axios');
const { logActivity } = require('./incidents');
// Need to require metrics, but allow for circular dependency if metrics/collectors imports monitor.
// Currently collectors.js imports monitor.js. So monitor.js importing collectors.js (where metrics might be managed?) is bad.
// But metrics/prometheus.js is separate. We can import that safely.
const { metrics } = require('../metrics/prometheus');
const { 
  getAllServices: getConfiguredServices, 
  getServicesByCluster,
  getServicesByRegion,
  loadServicesConfig 
} = require('../config/servicesLoader');

// Load services dynamically from configuration
const configuredServices = getConfiguredServices();

// Initialize system status from configuration
function initializeSystemStatus() {
  const services = {};
  for (const svc of configuredServices) {
    services[svc.name] = { 
      status: 'unknown', 
      code: 0, 
      lastUpdated: null,
      cluster: svc.cluster,
      clusterName: svc.clusterName,
      region: svc.region
    };
  }
  return {
    services,
    clusters: getServicesByCluster(),
    aiAnalysis: "Waiting for AI report...",
    lastUpdated: new Date()
  };
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
          ...systemStatus.services[service.name], // Preserve cluster metadata
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

/**
 * Get services grouped by cluster with current status
 * @returns {Object} Clusters with service status
 */
function getServicesGroupedByCluster() {
    const clusters = {};
    
    // Add static services from configuration
    for (const service of services) {
        const clusterId = service.cluster || 'default';
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
            ...systemStatus.services[service.name]
        });
    }
    
    // Add remote agent services
    for (const [name, data] of Object.entries(systemStatus.services)) {
        // Remote service format: "cluster:service"
        if (name.includes(':')) {
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
                name,
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
        if (!regions[regionId]) {
            regions[regionId] = {
                region: regionId,
                services: []
            };
        }
        regions[regionId].services.push({
            ...service,
            ...systemStatus.services[service.name]
        });
    }
    
    // Add remote agent services
    for (const [name, data] of Object.entries(systemStatus.services)) {
        // Remote service format: "cluster:service"
        if (name.includes(':')) {
            const regionId = data.region || 'remote';
            if (!regions[regionId]) {
                regions[regionId] = {
                    region: regionId,
                    services: []
                };
            }
            regions[regionId].services.push({
                name,
                ...data
            });
        }
    }
    
    return regions;
}

/**
 * Update service status from remote agent report
 * 
 * Note: Remote agent services use a namespaced naming convention: `${clusterId}:${serviceName}`
 * This distinguishes them from locally configured services (which use just `serviceName`).
 * This is intentional to avoid naming conflicts between services in different clusters.
 * 
 * @param {Object} report - Remote agent health report
 */
function handleRemoteAgentReport(report) {
    const { clusterId, clusterName, region, services: reportedServices } = report;
    
    for (const [serviceName, serviceData] of Object.entries(reportedServices)) {
        // Use namespaced format to distinguish remote services from local ones
        const fullServiceName = `${clusterId}:${serviceName}`;
        
        // Initialize if not exists
        if (!systemStatus.services[fullServiceName]) {
            systemStatus.services[fullServiceName] = {
                status: 'unknown',
                code: 0,
                lastUpdated: null,
                cluster: clusterId,
                clusterName: clusterName,
                region: region
            };
        }
        
        const prevStatus = systemStatus.services[fullServiceName].status;
        const newStatus = String(serviceData.status || 'unknown');
        
        // Log status changes
        if (newStatus === 'healthy' && prevStatus !== 'healthy' && prevStatus !== 'unknown') {
            logActivity('success', `[${clusterId}] Service ${serviceName} recovered to HEALTHY`);
        } else if (newStatus !== 'healthy' && prevStatus !== newStatus) {
            const severity = newStatus === 'critical' ? 'alert' : 'warn';
            logActivity(severity, `[${clusterId}] Service ${serviceName} is ${newStatus.toUpperCase()}`);
        }
        
        systemStatus.services[fullServiceName] = {
            ...systemStatus.services[fullServiceName],
            status: newStatus, // Use the type-safe string value
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
  getAllServices,
  startMonitoring,
  setWsBroadcaster,
  updateServiceStatus,
  checkServiceHealth, // Export for manual triggering
  getServicesGroupedByCluster,
  getServicesGroupedByRegion,
  handleRemoteAgentReport
};
