const { docker } = require('./client');

async function restartContainer(containerId) {
    try {
        const container = docker.getContainer(containerId);
        await container.restart({ t: 10 });
        return { action: 'restart', success: true, containerId };
    } catch (error) {
        console.error(`Failed to restart container ${containerId}:`, error);
        return { action: 'restart', success: false, containerId, error: error.message };
    }
}

async function recreateContainer(containerId) {
    try {
        const container = docker.getContainer(containerId);
        const info = await container.inspect();

        // Prepare new configuration
        // Use proper mapping for NetworkingConfig from validated inspection
        const networkingConfig = {
            EndpointsConfig: info.NetworkSettings.Networks
        };

        // Create new container first
        const newName = `${info.Name.replace('/', '')}-new`;
        const newContainer = await docker.createContainer({
            Image: info.Config.Image,
            name: newName,
            ...info.Config,
            HostConfig: info.HostConfig,
            NetworkingConfig: networkingConfig
        });

        await newContainer.start();

        // Now safely remove the old one if it was running
        if (info.State.Running) {
            await container.stop();
        }
        await container.remove();

        // Rename new container to old name
        await newContainer.rename({ name: info.Name.replace('/', '') });

        return { action: 'recreate', success: true, newId: newContainer.id };
    } catch (error) {
        console.error(`Failed to recreate container ${containerId}:`, error);
        return { action: 'recreate', success: false, containerId, error: error.message };
    }
}

async function scaleService(containerName, replicas) {
  try {
    const containers = await docker.listContainers({ all: true });

    const sameService = containers.filter(c =>
      c.Names.some(n => n.includes(containerName))
    );

    const currentCount = sameService.length;

    // SCALE UP
    if (replicas > currentCount) {

      const baseContainer = docker.getContainer(sameService[0].Id);
      const info = await baseContainer.inspect();

      for (let i = currentCount; i < replicas; i++) {

        const newName = `${containerName}-replica-${i}`;

        const newContainer = await docker.createContainer({
          Image: info.Config.Image,
          name: newName,
          Env: info.Config.Env,
          HostConfig: info.HostConfig
        });

        await newContainer.start();

        console.log(`Replica created: ${newName}`);
      }
    }

    // SCALE DOWN
    if (replicas < currentCount) {

      for (let i = replicas; i < currentCount; i++) {

        const container = docker.getContainer(sameService[i].Id);
        await container.stop();
        await container.remove();

        console.log(`Replica removed: ${sameService[i].Names[0]}`);
      }
    }

    return { success: true };

  } catch (err) {
    console.error("Scaling error:", err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { restartContainer, recreateContainer, scaleService };
