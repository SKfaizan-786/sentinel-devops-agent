const fs = require('fs');
const path = require('path');

/**
 * Loads service registry configuration from environment variable or JSON config file.
 * Supports multi-cluster/multi-region monitoring by defining named service groups.
 * 
 * Configuration format:
 * {
 *   "clusters": {
 *     "local": {
 *       "label": "Local Development",
 *       "region": "us-east-1",
 *       "services": [
 *         { "name": "auth", "url": "http://localhost:3001/health" },
 *         { "name": "payment", "url": "http://localhost:3002/health" },
 *         { "name": "notification", "url": "http://localhost:3003/health" }
 *       ]
 *     },
 *     "prod-us": {
 *       "label": "Production US",
 *       "region": "us-east-1",
 *       "services": [
 *         { "name": "auth", "url": "http://auth-prod-us:3001/health" },
 *         { "name": "payment", "url": "http://payment-prod-us:3002/health" },
 *         { "name": "notification", "url": "http://notification-prod-us:3003/health" }
 *       ]
 *     },
 *     "prod-eu": {
 *       "label": "Production EU",
 *       "region": "eu-west-1",
 *       "services": [
 *         { "name": "auth", "url": "http://auth-prod-eu:3001/health" },
 *         { "name": "payment", "url": "http://payment-prod-eu:3002/health" },
 *         { "name": "notification", "url": "http://notification-prod-eu:3003/health" }
 *       ]
 *     }
 *   },
 *   "defaultCluster": "local"
 * }
 */
function loadServicesConfig() {
  // 1. Check environment variable
  if (process.env.SERVICES_CONFIG) {
    try {
      const parsed = JSON.parse(process.env.SERVICES_CONFIG);
      return validateAndNormalizeConfig(parsed);
    } catch (err) {
      console.error('Failed to parse SERVICES_CONFIG from environment:', err.message);
    }
  }

  // 2. Check services.config.json file
  const configPath = path.join(__dirname, 'services.config.json');
  if (fs.existsSync(configPath)) {
    try {
      const data = fs.readFileSync(configPath, 'utf8');
      const parsed = JSON.parse(data);
      return validateAndNormalizeConfig(parsed);
    } catch (err) {
      console.error('Failed to parse services.config.json:', err.message);
    }
  }

  // 3. Fallback to default local configuration
  console.warn('No service configuration found, using default localhost configuration');
  return getDefaultLocalConfig();
}

function validateAndNormalizeConfig(config) {
  const result = {
    clusters: {},
    defaultCluster: 'local'
  };

  // Handle legacy format (flat services array)
  if (config.services && Array.isArray(config.services)) {
    result.clusters.local = {
      label: 'Local',
      region: 'local',
      services: config.services
    };
    return result;
  }

  // Handle new multi-cluster format
  if (config.clusters && typeof config.clusters === 'object') {
    for (const [clusterId, clusterConfig] of Object.entries(config.clusters)) {
      result.clusters[clusterId] = {
        label: clusterConfig.label || clusterId,
        region: clusterConfig.region || 'unknown',
        services: clusterConfig.services || []
      };
    }
  }

  if (config.defaultCluster) {
    result.defaultCluster = config.defaultCluster;
  }

  // Validate at least one cluster exists
  const clusterIds = Object.keys(result.clusters);
  if (clusterIds.length === 0) {
    console.warn('No clusters defined in configuration, using default local config');
    return getDefaultLocalConfig();
  }

  console.log(`Loaded ${clusterIds.length} cluster(s): ${clusterIds.join(', ')}`);
  return result;
}

function getDefaultLocalConfig() {
  return {
    clusters: {
      local: {
        label: 'Local Development',
        region: 'local',
        services: [
          { name: 'auth', url: 'http://localhost:3001/health' },
          { name: 'payment', url: 'http://localhost:3002/health' },
          { name: 'notification', url: 'http://localhost:3003/health' }
        ]
      }
    },
    defaultCluster: 'local'
  };
}

/**
 * Get all services from all clusters or a specific cluster
 */
function getAllServices(config = null, clusterId = null) {
  const cfg = config || loadServicesConfig();
  
  if (clusterId && cfg.clusters[clusterId]) {
    return cfg.clusters[clusterId].services.map(s => ({
      ...s,
      cluster: clusterId,
      clusterLabel: cfg.clusters[clusterId].label,
      region: cfg.clusters[clusterId].region
    }));
  }

  // Return all services from all clusters
  const allServices = [];
  for (const [cid, cluster] of Object.entries(cfg.clusters)) {
    for (const service of cluster.services) {
      allServices.push({
        ...service,
        cluster: cid,
        clusterLabel: cluster.label,
        region: cluster.region
      });
    }
  }
  return allServices;
}

/**
 * Get list of all cluster IDs
 */
function getClusterIds(config = null) {
  const cfg = config || loadServicesConfig();
  return Object.keys(cfg.clusters);
}

/**
 * Get cluster info by ID
 */
function getClusterInfo(clusterId, config = null) {
  const cfg = config || loadServicesConfig();
  return cfg.clusters[clusterId] || null;
}

module.exports = {
  loadServicesConfig,
  getAllServices,
  getClusterIds,
  getClusterInfo
};