/**
 * Multi-host Docker configuration loader
 * Supports loading host configurations from:
 * - Environment variable DOCKER_HOSTS (JSON string)
 * - hosts.json file
 * - Default local Docker socket
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_HOST = {
  id: 'local',
  label: 'Local Docker',
  socketPath: process.platform === 'win32' 
    ? '//./pipe/docker_engine' 
    : (process.env.DOCKER_SOCKET || '/var/run/docker.sock'),
  type: 'local'
};

/**
 * Load hosts configuration from environment or file
 * @returns {Array<Object>} Array of host configurations
 */
function loadHostsConfig() {
  // Priority 1: Environment variable
  if (process.env.DOCKER_HOSTS) {
    try {
      const config = JSON.parse(process.env.DOCKER_HOSTS);
      if (Array.isArray(config.hosts) && config.hosts.length > 0) {
        return validateHosts(config.hosts);
      }
      if (Array.isArray(config) && config.length > 0) {
        return validateHosts(config);
      }
    } catch (err) {
      console.warn('[HostConfig] Failed to parse DOCKER_HOSTS env:', err.message);
      console.warn('[HostConfig] Expected format: {"hosts":[{"id":"local","label":"Local Docker","type":"local","socketPath":"/var/run/docker.sock"}]}');
    }
  }

  // Priority 2: hosts.json file
  const hostsFilePath = path.join(__dirname, 'hosts.json');
  if (fs.existsSync(hostsFilePath)) {
    try {
      const content = fs.readFileSync(hostsFilePath, 'utf8');
      const config = JSON.parse(content);
      if (Array.isArray(config.hosts) && config.hosts.length > 0) {
        return validateHosts(config.hosts);
      }
    } catch (err) {
      console.warn('[HostConfig] Failed to load hosts.json:', err.message);
    }
  }

  // Default: Single local Docker host
  return [DEFAULT_HOST];
}

/**
 * Validate and normalize host configurations
 * @param {Array<Object>} hosts - Array of host configs
 * @returns {Array<Object>} Validated host configs
 */
function validateHosts(hosts) {
  const validated = [];
  const seenIds = new Set();

  for (const host of hosts) {
    // Required: id must be unique
    if (!host.id || typeof host.id !== 'string') {
      console.warn('[HostConfig] Skipping host without valid id:', host);
      continue;
    }

    if (seenIds.has(host.id)) {
      console.warn(`[HostConfig] Duplicate host id '${host.id}', skipping`);
      continue;
    }
    seenIds.add(host.id);

    // Normalize host config
    const normalized = {
      id: host.id,
      label: host.label || host.id,
      type: host.type || 'local',
    };

    switch (normalized.type) {
      case 'local':
        normalized.socketPath = host.socketPath || DEFAULT_HOST.socketPath;
        break;
      case 'remote':
      case 'tcp':
        if (!host.host) {
          console.warn(`[HostConfig] Remote host '${host.id}' missing host URL, skipping`);
          continue;
        }
        normalized.host = host.host;
        normalized.port = host.port || 2376;
        normalized.tls = host.tls === true;
        if (host.ca) normalized.ca = host.ca;
        if (host.cert) normalized.cert = host.cert;
        if (host.key) normalized.key = host.key;
        break;
      case 'ssh':
        if (!host.host) {
          console.warn(`[HostConfig] SSH host '${host.id}' missing host URL, skipping`);
          continue;
        }
        normalized.host = host.host;
        if (host.username) normalized.username = host.username;
        if (host.privateKey) normalized.privateKey = host.privateKey;
        break;
      default:
        console.warn(`[HostConfig] Unknown host type '${normalized.type}' for '${host.id}'`);
        // Still add it but mark as unknown
        normalized.type = 'unknown';
    }

    validated.push(normalized);
  }

  // Ensure at least one host
  if (validated.length === 0) {
    return [DEFAULT_HOST];
  }

  return validated;
}

/**
 * Get the default host configuration
 * @returns {Object} Default host config
 */
function getDefaultHost() {
  return DEFAULT_HOST;
}

module.exports = {
  loadHostsConfig,
  validateHosts,
  getDefaultHost,
  DEFAULT_HOST
};
