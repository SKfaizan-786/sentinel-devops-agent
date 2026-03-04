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

async function scaleService(serviceName, replicas) {
    try {
        const service = docker.getService(serviceName);
        const info = await service.inspect();
        const version = info.Version.Index;

        // Merge new replicas into existing spec
        const spec = { ...info.Spec };
        if (!spec.Mode) spec.Mode = {};
        if (!spec.Mode.Replicated) spec.Mode.Replicated = {};
        spec.Mode.Replicated.Replicas = parseInt(replicas, 10);

        await service.update({
            version: version,
            ...spec
        });
        return { action: 'scale', replicas, success: true };
    } catch (error) {
        console.error(`Failed to scale service ${serviceName}:`, error);
        return { action: 'scale', replicas, success: false, error: error.message };
    }
}

module.exports = { restartContainer, recreateContainer, scaleService };
