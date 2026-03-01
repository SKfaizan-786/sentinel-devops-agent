const Docker = require('dockerode');

const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock')
});

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

    // 🔹 Ignore expected 404 when container was recreated/removed
    if (error.statusCode === 404 || error.reason === 'no such container') {
      return { status: 'removed', failingStreak: 0, log: [] };
    }

    // 🔹 Only log unexpected errors
    console.error(`Unexpected health error for ${containerId}:`, error.message);

    return { status: 'error', failingStreak: 0, log: [] };
  }
}

module.exports = { docker, listContainers, getContainerHealth };
