const Docker = require('dockerode');
const { loadHostsConfig } = require('../config/hosts');
const { isSwarmMode, getSwarmInfo } = require('./swarm');

/**
 * DockerHostManager - Manages multiple Docker host connections
 * Supports local, remote (TCP), and SSH connections
 */
class DockerHostManager {
  constructor() {
    this.hosts = new Map();
    this.initialized = false;
  }

  /**
   * Initialize connections to all configured hosts
   * @param {Array<Object>} hostsConfig - Optional custom hosts config
   * @returns {Promise<void>}
   */
  async initialize(hostsConfig = null) {
    const config = hostsConfig || loadHostsConfig();
    
    for (const hostDef of config) {
      await this.addHost(hostDef);
    }
    
    this.initialized = true;
    console.log(`[DockerHostManager] Initialized with ${this.hosts.size} host(s)`);
  }

  /**
   * Add a single host to the manager
   * @param {Object} hostDef - Host definition
   * @returns {Promise<Object>} Host entry with connection status
   */
  async addHost(hostDef) {
    try {
      const client = this._createClient(hostDef);
      
      // Test connection
      await client.ping();
      
      // Check for Swarm mode
      const swarmActive = await isSwarmMode(client);
      const swarmInfo = swarmActive ? await getSwarmInfo(client) : null;
      
      // Get Docker info for host health
      const info = await client.info();
      
      const hostEntry = {
        ...hostDef,
        client,
        status: 'connected',
        swarmActive,
        swarmInfo,
        dockerVersion: info.ServerVersion,
        containers: info.Containers || 0,
        containersRunning: info.ContainersRunning || 0,
        containersPaused: info.ContainersPaused || 0,
        containersStopped: info.ContainersStopped || 0,
        images: info.Images || 0,
        memoryTotal: info.MemTotal || 0,
        cpuCount: info.NCPU || 0,
        lastChecked: new Date()
      };
      
      this.hosts.set(hostDef.id, hostEntry);
      console.log(`[DockerHostManager] Connected to host '${hostDef.id}' (Docker ${info.ServerVersion})`);
      
      return hostEntry;
    } catch (err) {
      const hostEntry = {
        ...hostDef,
        client: null,
        status: 'disconnected',
        error: err.message,
        lastChecked: new Date()
      };
      
      this.hosts.set(hostDef.id, hostEntry);
      console.warn(`[DockerHostManager] Failed to connect to host '${hostDef.id}': ${err.message}`);
      
      return hostEntry;
    }
  }

  /**
   * Create a Dockerode client based on host type
   * @param {Object} hostDef - Host definition
   * @returns {Object} Dockerode client instance
   */
  _createClient(hostDef) {
    switch (hostDef.type) {
      case 'local':
        return new Docker({
          socketPath: hostDef.socketPath || '/var/run/docker.sock'
        });
      
      case 'remote':
      case 'tcp': {
        const opts = {
          host: this._extractHost(hostDef.host),
          port: hostDef.port || 2376
        };
        
        if (hostDef.tls) {
          opts.protocol = 'https';
          if (hostDef.ca) opts.ca = hostDef.ca;
          if (hostDef.cert) opts.cert = hostDef.cert;
          if (hostDef.key) opts.key = hostDef.key;
        }
        
        return new Docker(opts);
      }
      
      case 'ssh':
        // SSH connections require ssh2 package and additional setup
        // For now, fall back to TCP if URL is provided
        console.warn(`[DockerHostManager] SSH connections not fully implemented for '${hostDef.id}'`);
        return new Docker({
          host: this._extractHost(hostDef.host),
          port: hostDef.port || 2376
        });
      
      default:
        return new Docker({
          socketPath: hostDef.socketPath || '/var/run/docker.sock'
        });
    }
  }

  /**
   * Extract hostname from a URL
   * @param {string} hostUrl - Host URL (e.g., tcp://192.168.1.100:2376)
   * @returns {string} Hostname
   */
  _extractHost(hostUrl) {
    if (!hostUrl) return 'localhost';
    const match = hostUrl.match(/(?:tcp|ssh|https?):\/\/([^:/]+)/);
    return match ? match[1] : hostUrl;
  }

  /**
   * Refresh health status for all hosts
   * @returns {Promise<void>}
   */
  async refreshAll() {
    const refreshPromises = [];
    
    for (const [hostId, host] of this.hosts) {
      if (host.client) {
        refreshPromises.push(this._refreshHost(hostId, host));
      }
    }
    
    await Promise.allSettled(refreshPromises);
  }

  /**
   * Refresh a single host's status
   * @param {string} hostId - Host ID
   * @param {Object} host - Host entry
   */
  async _refreshHost(hostId, host) {
    try {
      await host.client.ping();
      const info = await host.client.info();
      
      host.status = 'connected';
      host.containers = info.Containers || 0;
      host.containersRunning = info.ContainersRunning || 0;
      host.containersPaused = info.ContainersPaused || 0;
      host.containersStopped = info.ContainersStopped || 0;
      host.memoryTotal = info.MemTotal || 0;
      host.cpuCount = info.NCPU || 0;
      host.lastChecked = new Date();
      delete host.error;
    } catch (err) {
      host.status = 'disconnected';
      host.error = err.message;
      host.lastChecked = new Date();
    }
  }

  /**
   * Get all hosts
   * @returns {Array<Object>} All host entries
   */
  getAll() {
    return [...this.hosts.values()];
  }

  /**
   * Get a specific host
   * @param {string} hostId - Host ID
   * @returns {Object|undefined} Host entry
   */
  get(hostId) {
    return this.hosts.get(hostId);
  }

  /**
   * Get all connected hosts
   * @returns {Array<Object>} Connected host entries
   */
  getConnected() {
    return this.getAll().filter(h => h.status === 'connected');
  }

  /**
   * Get the first connected host (for backward compatibility)
   * @returns {Object|null} First connected host or null
   */
  getDefault() {
    const connected = this.getConnected();
    return connected.length > 0 ? connected[0] : null;
  }

  /**
   * Get Docker client for a specific host (only if connected)
   * @param {string} hostId - Host ID
   * @returns {Object|null} Dockerode client or null if not connected
   */
  getClient(hostId) {
    const host = this.hosts.get(hostId);
    return (host?.status === 'connected') ? host.client : null;
  }

  /**
   * Parse compound ID (hostId:containerId)
   * @param {string} compoundId - Compound container ID
   * @returns {Object} Parsed { hostId, containerId }
   */
  parseId(compoundId) {
    if (!compoundId || typeof compoundId !== 'string') {
      const defaultHost = this.getDefault();
      return { hostId: defaultHost?.id || 'local', containerId: compoundId || '' };
    }
    
    const colonIndex = compoundId.indexOf(':');
    if (colonIndex === -1) {
      const defaultHost = this.getDefault();
      return { hostId: defaultHost?.id || 'local', containerId: compoundId };
    }
    
    return {
      hostId: compoundId.substring(0, colonIndex),
      containerId: compoundId.substring(colonIndex + 1)
    };
  }

  /**
   * Create compound ID from hostId and containerId
   * @param {string} hostId - Host ID
   * @param {string} containerId - Container ID
   * @returns {string} Compound ID
   */
  createCompoundId(hostId, containerId) {
    return `${hostId}:${containerId}`;
  }
}

// Singleton instance
const hostManager = new DockerHostManager();

// Legacy single docker instance for backward compatibility
const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock')
});

/**
 * List containers from all connected hosts or a specific host
 * @param {Object} filters - Container filters
 * @param {string} hostId - Optional host ID to filter by
 * @returns {Promise<Array>} Array of containers with hostId
 */
async function listContainers(filters = {}, hostId = null) {
  // If hostManager not initialized, use legacy behavior
  if (!hostManager.initialized) {
    try {
      const containers = await docker.listContainers({
        all: true,
        filters: {
          label: ['sentinel.monitor=true'],
          ...filters
        }
      });

      return containers.map(container => ({
        id: container.Id,
        displayId: container.Id.slice(0, 12),
        name: container.Names[0].replace('/', ''),
        image: container.Image,
        status: container.State,
        health: container.Status.includes('unhealthy') ? 'unhealthy' :
          container.Status.includes('healthy') ? 'healthy' : 'unknown',
        ports: container.Ports,
        created: new Date(container.Created * 1000),
        hostId: 'local'
      }));
    } catch (error) {
      console.error("Error listing containers:", error);
      return [];
    }
  }

  // Multi-host mode
  let hostsToQuery;
  if (hostId) {
    const host = hostManager.get(hostId);
    if (!host) {
      const err = new Error(`Host '${hostId}' not found`);
      err.code = 'HOST_NOT_FOUND';
      err.statusCode = 404;
      throw err;
    }
    if (host.status !== 'connected') {
      const err = new Error(`Host '${hostId}' is unreachable`);
      err.code = 'HOST_UNREACHABLE';
      err.statusCode = 503;
      throw err;
    }
    hostsToQuery = [host];
  } else {
    hostsToQuery = hostManager.getConnected();
  }

  const results = await Promise.allSettled(
    hostsToQuery.map(async (host) => {
      try {
        const containers = await host.client.listContainers({
          all: true,
          filters: {
            label: ['sentinel.monitor=true'],
            ...filters
          }
        });

        return containers.map(container => ({
          id: hostManager.createCompoundId(host.id, container.Id),
          containerId: container.Id,
          displayId: container.Id.slice(0, 12),
          name: container.Names[0].replace('/', ''),
          image: container.Image,
          status: container.State,
          health: container.Status.includes('unhealthy') ? 'unhealthy' :
            container.Status.includes('healthy') ? 'healthy' : 'unknown',
          ports: container.Ports,
          created: new Date(container.Created * 1000),
          hostId: host.id,
          hostLabel: host.label
        }));
      } catch (error) {
        console.error(`Error listing containers from host '${host.id}':`, error.message);
        return [];
      }
    })
  );

  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

/**
 * Get container health from appropriate host
 * @param {string} compoundId - Compound ID (hostId:containerId) or raw containerId
 * @returns {Promise<Object>} Health status
 */
async function getContainerHealth(compoundId) {
  const { hostId, containerId } = hostManager.parseId(compoundId);
  
  // Get the appropriate client
  const client = hostManager.initialized 
    ? hostManager.getClient(hostId) 
    : docker;
  
  if (!client) {
    console.error(`No client available for host '${hostId}'`);
    return { status: 'unknown', failingStreak: 0, log: [] };
  }

  try {
    const container = client.getContainer(containerId);
    const info = await container.inspect();

    return {
      status: info.State.Health?.Status || 'none',
      failingStreak: info.State.Health?.FailingStreak || 0,
      log: info.State.Health?.Log?.slice(-5) || [],
      hostId
    };
  } catch (error) {
    console.error(`Error getting health for ${containerId} on host ${hostId}:`, error.message);
    return { status: 'unknown', failingStreak: 0, log: [], hostId };
  }
}

module.exports = { 
  docker, 
  hostManager,
  listContainers, 
  getContainerHealth 
};
