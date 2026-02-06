const Docker = require('dockerode');

// Support both socket and TCP connections
const docker = new Docker({
  socketPath: process.env.DOCKER_SOCKET || '//./pipe/docker_engine', 
  // Adjusted for Windows default pipe if needed, or /var/run/docker.sock for Linux/WSL
  // The user prompt said: socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
  // But USER OS is Windows. Windows Docker Desktop usually uses named pipes //./pipe/docker_engine
  // However, if they are using WSL2, it might be the unix socket.
  // I'll stick to a reasonable default or what the user provided but comment on Windows.
  // User provided: socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock'
  // I will use logical OR for windows pipe if on windows? 
  // Actually, dockerode automatically handles default if arguments are empty, but the user code had explicit config.
  // I will use:
  // socketPath: process.env.DOCKER_SOCKET || (process.platform === 'win32' ? '//./pipe/docker_engine' : '/var/run/docker.sock')
});

async function listContainers(filters = {}) {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: ['sentinel.monitor=true'], // Only monitor labeled containers
        ...filters
      }
    });

    return containers.map(container => ({
      id: container.Id.slice(0, 12),
      name: container.Names[0].replace('/', ''),
      image: container.Image,
      status: container.State,
      health: container.Status.includes('healthy') ? 'healthy' :
              container.Status.includes('unhealthy') ? 'unhealthy' : 'unknown',
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
