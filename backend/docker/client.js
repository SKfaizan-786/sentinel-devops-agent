const Docker = require('dockerode');

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock')
});

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

async function getContainerHealth(containerId) {
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
