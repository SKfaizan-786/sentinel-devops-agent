/**
 * Introspects if the provided Docker client is functioning as a Swarm manager/worker.
 * @param {Object} dockerClient Active Dockerode client target
 * @returns {Promise<boolean>} True if swarm mode is active
 */
async function isSwarmMode(dockerClient) {
    try {
        const info = await dockerClient.info();
        return info.Swarm?.LocalNodeState === 'active';
    } catch (err) {
        console.error('[Swarm] Failed to check swarm mode:', err.message);
        return false;
    }
}

/**
 * Fetches configured Swarm services running on the cluster.
 * @param {Object} dockerClient Active Dockerode client target 
 * @returns {Promise<Array>} List of swarm services mapping ID, Name, Replicas, Image and State
 */
async function listSwarmServices(dockerClient) {
    try {
        const services = await dockerClient.listServices();
        return services.map(svc => ({
            id: svc.ID,
            name: svc.Spec.Name,
            replicas: svc.Spec.Mode?.Replicated?.Replicas,
            image: svc.Spec.TaskTemplate?.ContainerSpec?.Image,
            state: svc.UpdateStatus?.State || 'running',
        }));
    } catch (err) {
        console.error('[Swarm] Failed to list swarm services:', err.message);
        return [];
    }
}

module.exports = { isSwarmMode, listSwarmServices };
