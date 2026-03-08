/**
 * Docker Swarm service discovery and management
 * Provides utilities to detect Swarm mode and list services/tasks
 */

/**
 * Check if a Docker host is running in Swarm mode
 * @param {Object} dockerClient - Dockerode client instance
 * @returns {Promise<boolean>} True if Swarm mode is active
 */
async function isSwarmMode(dockerClient) {
  try {
    const info = await dockerClient.info();
    return info.Swarm?.LocalNodeState === 'active';
  } catch (err) {
    console.error('[Swarm] Error checking Swarm mode:', err.message);
    return false;
  }
}

/**
 * Get Swarm node information
 * @param {Object} dockerClient - Dockerode client instance
 * @returns {Promise<Object|null>} Swarm node info or null
 */
async function getSwarmInfo(dockerClient) {
  try {
    const info = await dockerClient.info();
    if (info.Swarm?.LocalNodeState !== 'active') {
      return null;
    }

    return {
      nodeId: info.Swarm.NodeID,
      nodeAddr: info.Swarm.NodeAddr,
      isManager: info.Swarm.ControlAvailable === true,
      nodes: info.Swarm.Nodes || 0,
      managers: info.Swarm.Managers || 0,
      cluster: info.Swarm.Cluster?.ID || null
    };
  } catch (err) {
    console.error('[Swarm] Error getting Swarm info:', err.message);
    return null;
  }
}

/**
 * List all Swarm services
 * @param {Object} dockerClient - Dockerode client instance
 * @returns {Promise<Array>} Array of service objects
 */
async function listSwarmServices(dockerClient) {
  try {
    const services = await dockerClient.listServices();
    return services.map(svc => ({
      id: svc.ID,
      name: svc.Spec?.Name || 'unknown',
      replicas: svc.Spec?.Mode?.Replicated?.Replicas ?? null,
      isGlobal: !!svc.Spec?.Mode?.Global,
      image: svc.Spec?.TaskTemplate?.ContainerSpec?.Image || 'unknown',
      state: svc.UpdateStatus?.State || 'running',
      createdAt: svc.CreatedAt,
      updatedAt: svc.UpdatedAt,
      version: svc.Version?.Index
    }));
  } catch (err) {
    console.error('[Swarm] Error listing services:', err.message);
    return [];
  }
}

/**
 * List Swarm tasks (container instances of services)
 * @param {Object} dockerClient - Dockerode client instance
 * @param {string} serviceId - Optional service ID to filter by
 * @returns {Promise<Array>} Array of task objects
 */
async function listSwarmTasks(dockerClient, serviceId = null) {
  try {
    const filters = serviceId ? { service: [serviceId] } : {};
    const tasks = await dockerClient.listTasks({ filters });
    
    return tasks.map(task => ({
      id: task.ID,
      serviceId: task.ServiceID,
      nodeId: task.NodeID,
      status: task.Status?.State || 'unknown',
      desiredState: task.DesiredState,
      containerId: task.Status?.ContainerStatus?.ContainerID || null,
      message: task.Status?.Message || '',
      error: task.Status?.Err || null,
      createdAt: task.CreatedAt,
      slot: task.Slot
    }));
  } catch (err) {
    console.error('[Swarm] Error listing tasks:', err.message);
    return [];
  }
}

/**
 * List Swarm nodes
 * @param {Object} dockerClient - Dockerode client instance
 * @returns {Promise<Array>} Array of node objects
 */
async function listSwarmNodes(dockerClient) {
  try {
    const nodes = await dockerClient.listNodes();
    return nodes.map(node => ({
      id: node.ID,
      hostname: node.Description?.Hostname || 'unknown',
      role: node.Spec?.Role || 'worker',
      availability: node.Spec?.Availability || 'active',
      state: node.Status?.State || 'unknown',
      addr: node.Status?.Addr || null,
      isManager: node.ManagerStatus !== undefined,
      isLeader: node.ManagerStatus?.Leader === true,
      engineVersion: node.Description?.Engine?.EngineVersion || 'unknown',
      os: node.Description?.Platform?.OS || 'unknown',
      arch: node.Description?.Platform?.Architecture || 'unknown'
    }));
  } catch (err) {
    console.error('[Swarm] Error listing nodes:', err.message);
    return [];
  }
}

/**
 * Get service details with tasks
 * @param {Object} dockerClient - Dockerode client instance
 * @param {string} serviceId - Service ID or name
 * @returns {Promise<Object|null>} Service details with tasks
 */
async function getServiceDetails(dockerClient, serviceId) {
  try {
    const service = dockerClient.getService(serviceId);
    const info = await service.inspect();
    const tasks = await listSwarmTasks(dockerClient, info.ID);
    
    const runningTasks = tasks.filter(t => t.status === 'running');
    const failedTasks = tasks.filter(t => t.status === 'failed');
    
    return {
      id: info.ID,
      name: info.Spec?.Name,
      version: info.Version?.Index,
      replicas: info.Spec?.Mode?.Replicated?.Replicas ?? null,
      isGlobal: !!info.Spec?.Mode?.Global,
      image: info.Spec?.TaskTemplate?.ContainerSpec?.Image,
      state: info.UpdateStatus?.State || 'running',
      tasks: {
        total: tasks.length,
        running: runningTasks.length,
        failed: failedTasks.length,
        items: tasks
      },
      createdAt: info.CreatedAt,
      updatedAt: info.UpdatedAt
    };
  } catch (err) {
    console.error(`[Swarm] Error getting service ${serviceId}:`, err.message);
    return null;
  }
}

module.exports = {
  isSwarmMode,
  getSwarmInfo,
  listSwarmServices,
  listSwarmTasks,
  listSwarmNodes,
  getServiceDetails
};
