const Docker = require('dockerode');

<<<<<<< HEAD
/**
 * DockerHostManager manages multihost environment configurations and lifecycle.
 */
class DockerHostManager {
  constructor() {
    this.hosts = new Map();
  }

  async loadHosts(hostsConfig) {
    for (const [id, hostData] of this.hosts.entries()) {
      if (hostData.sshClient) hostData.sshClient.end();
    }
    this.hosts.clear();

    for (const hostDef of hostsConfig) {
      try {
        let client;
        let sshClient = null;

        if (hostDef.type === 'local') {
          client = new Docker({ socketPath: hostDef.socketPath || '/var/run/docker.sock' });
        } else if (hostDef.type === 'remote') {
          const url = new URL(hostDef.host.startsWith('tcp://') ? hostDef.host.replace('tcp://', 'http://') : hostDef.host);
          client = new Docker({ host: url.hostname, port: hostDef.port || url.port || 2376 });
        } else if (hostDef.type === 'ssh') {
          const sshUrl = new URL(hostDef.host.replace('ssh://', 'http://'));
          const sshOptions = {
            agent: process.env.SSH_AUTH_SOCK
          };
          if (hostDef.privateKey) sshOptions.privateKey = hostDef.privateKey;
          else if (hostDef.password) sshOptions.password = hostDef.password;

          client = new Docker({
            protocol: 'ssh',
            host: sshUrl.hostname,
            port: sshUrl.port || 22,
            username: sshUrl.username || 'root',
            sshOptions
          });
        }

        await client.ping();
        this.hosts.set(hostDef.id, { ...hostDef, client, sshClient, status: 'connected' });
      } catch (err) {
        console.error(`Failed to connect to Docker host ${hostDef.id}:`, err);
        this.hosts.set(hostDef.id, { ...hostDef, client: null, status: 'disconnected', error: err.message });
      }
    }
  }

  getAll() { return [...this.hosts.values()]; }
  get(hostId) { return this.hosts.get(hostId); }
  getConnected() { return this.getAll().filter(h => h.status === 'connected'); }

  parseId(compoundId) {
    const parts = (compoundId || '').split(':');
    if (parts.length > 1) {
      return { hostId: parts[0], containerId: parts.slice(1).join(':') };
    }
    const hosts = this.getConnected();
    const hostId = hosts.length > 0 ? hosts[0].id : 'local';
    return { hostId, containerId: compoundId };
  }
}

const hostManager = new DockerHostManager();
=======
const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock')
});
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)

/**
 * Retrieves containers mapped across all available hosts with rich metadata.
 * @param {Object} filters Options applied to limit scope natively
 * @returns {Promise<Array>}
 */
async function listContainers(filters = {}) {
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
      created: new Date(container.Created * 1000)
    }));
  } catch (error) {
    console.error("Error listing containers:", error);
    return [];
  }
}

<<<<<<< HEAD
/**
 * Introspects health for container using a unified compoundID.
 * @param {string} compoundId The id structured {host}:{containerId}
 */
async function getContainerHealth(compoundId) {
=======
async function getContainerHealth(containerId) {
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
  try {
    const container = docker.getContainer(containerId);
    const info = await container.inspect();

    return {
      status: info.State.Health?.Status || 'none',
      failingStreak: info.State.Health?.FailingStreak || 0,
      log: info.State.Health?.Log?.slice(-5) || []
    };
  } catch (error) {
    console.error(`Error getting health for ${containerId}:`, error);
    return { status: 'unknown', failingStreak: 0, log: [] };
  }
}

module.exports = { docker, listContainers, getContainerHealth };
