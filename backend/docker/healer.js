const { docker } = require('./client');

async function restartContainer(containerId) {
    try {
        const container = docker.getContainer(containerId);
        await container.restart({ t: 10 }); // 10 second timeout
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

        // Stop and remove
        await container.stop();
        await container.remove();

        // Recreate with same config
        const config = info.Config;
        const hostConfig = info.HostConfig;
        // Note: Creating a container exactly as before can be complex if there are many options.
        // We strive to copy the most important ones.

        const newContainer = await docker.createContainer({
            Image: config.Image,
            name: info.Name.replace('/', ''),
            ...config,
            HostConfig: hostConfig,
            NetworkingConfig: info.NetworkSettings
        });

        await newContainer.start();
        return { action: 'recreate', success: true, newId: newContainer.id };
    } catch (error) {
        console.error(`Failed to recreate container ${containerId}:`, error);
        return { action: 'recreate', success: false, containerId, error: error.message };
    }
}

async function scaleService(serviceName, replicas) {
    // For Docker Swarm
    try {
        const service = docker.getService(serviceName);
        const info = await service.inspect();
        const version = info.Version.Index;

        await service.update({
            version: version, // Required for update
            Mode: {
                Replicated: { Replicas: parseInt(replicas) }
            },
            TaskTemplate: info.Spec.TaskTemplate
        });
        return { action: 'scale', replicas, success: true };
    } catch (error) {
        console.error(`Failed to scale service ${serviceName}:`, error);
        return { action: 'scale', replicas, success: false, error: error.message };
    }
}

module.exports = { restartContainer, recreateContainer, scaleService };
