const axios = require('axios');
const { logActivity } = require('./incidents');
const { metrics } = require('../metrics/prometheus');
<<<<<<< HEAD
const { loadServicesConfig, getAllServices, getClusterIds } = require('../config/services');

let systemStatus = {
  clusters: {},
  aiAnalysis: "Waiting for AI report...",
  lastUpdated: null
};

=======
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

>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
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

<<<<<<< HEAD
        clusterStatus.services[service.name] = {
=======
        systemStatus.services[service.name] = {
          ...systemStatus.services[service.name], // Preserve cluster metadata
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
async function startMonitoring(intervalMs = 5000) {
  initializeSystemStatus();
  await checkServiceHealth();
  setInterval(checkServiceHealth, intervalMs);
=======
function startMonitoring(intervalMs = 5000) {
    setInterval(checkServiceHealth, intervalMs);
    checkServiceHealth();
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
function startMonitoring(intervalMs = 5000) {
    setInterval(checkServiceHealth, intervalMs);
    checkServiceHealth();
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
function startMonitoring(intervalMs = 5000) {
    setInterval(checkServiceHealth, intervalMs);
    checkServiceHealth();
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
function startMonitoring(intervalMs = 5000) {
    setInterval(checkServiceHealth, intervalMs);
    checkServiceHealth();
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
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
  getAllServicesInfo,
  startMonitoring,
  setWsBroadcaster,
  updateServiceStatus,
<<<<<<< HEAD
  checkServiceHealth,
  handleAgentMetrics,
  initializeSystemStatus
};
=======
  checkServiceHealth, // Export for manual triggering
  getServicesGroupedByCluster,
  getServicesGroupedByRegion,
  handleRemoteAgentReport
};
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
