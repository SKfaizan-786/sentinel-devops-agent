/**
 * Hosts Routes - API endpoints for multi-host Docker management
 * Provides endpoints to list hosts, check status, and manage Swarm services
 */

const express = require('express');
const router = express.Router();
const { hostManager } = require('../docker/client');
const swarm = require('../docker/swarm');
const { ERRORS } = require('../lib/errors');

/**
 * GET /api/hosts
 * List all configured Docker hosts with their status
 */
router.get('/', async (req, res) => {
  try {
    const hosts = hostManager.getAll().map(host => ({
      id: host.id,
      label: host.label,
      type: host.type,
      status: host.status,
      error: host.error,
      swarmActive: host.swarmActive || false,
      swarmInfo: host.swarmInfo || null,
      dockerVersion: host.dockerVersion,
      containers: host.containers || 0,
      containersRunning: host.containersRunning || 0,
      containersPaused: host.containersPaused || 0,
      containersStopped: host.containersStopped || 0,
      images: host.images || 0,
      memoryTotal: host.memoryTotal || 0,
      cpuCount: host.cpuCount || 0,
      lastChecked: host.lastChecked
    }));

    res.json({
      total: hosts.length,
      connected: hosts.filter(h => h.status === 'connected').length,
      hosts
    });
  } catch (error) {
    console.error('[Hosts API] Error listing hosts:', error);
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

/**
 * GET /api/hosts/:hostId
 * Get details for a specific host
 */
router.get('/:hostId', async (req, res) => {
  try {
    const { hostId } = req.params;
    const host = hostManager.get(hostId);
    
    if (!host) {
      return res.status(404).json({
        error: {
          code: 'HOST_NOT_FOUND',
          message: `Host '${hostId}' not found`
        }
      });
    }

    res.json({
      id: host.id,
      label: host.label,
      type: host.type,
      status: host.status,
      error: host.error,
      swarmActive: host.swarmActive || false,
      swarmInfo: host.swarmInfo || null,
      dockerVersion: host.dockerVersion,
      containers: host.containers || 0,
      containersRunning: host.containersRunning || 0,
      containersPaused: host.containersPaused || 0,
      containersStopped: host.containersStopped || 0,
      images: host.images || 0,
      memoryTotal: host.memoryTotal || 0,
      cpuCount: host.cpuCount || 0,
      lastChecked: host.lastChecked
    });
  } catch (error) {
    console.error(`[Hosts API] Error getting host ${req.params.hostId}:`, error);
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

/**
 * POST /api/hosts/refresh
 * Refresh all host connections and status
 */
router.post('/refresh', async (req, res) => {
  try {
    await hostManager.refreshAll();
    
    const hosts = hostManager.getAll().map(host => ({
      id: host.id,
      label: host.label,
      status: host.status,
      error: host.error,
      containersRunning: host.containersRunning || 0,
      lastChecked: host.lastChecked
    }));

    res.json({
      success: true,
      message: 'All hosts refreshed',
      hosts
    });
  } catch (error) {
    console.error('[Hosts API] Error refreshing hosts:', error);
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

/**
 * GET /api/hosts/:hostId/swarm/services
 * List Swarm services for a specific host (must be Swarm manager)
 */
router.get('/:hostId/swarm/services', async (req, res) => {
  try {
    const { hostId } = req.params;
    const host = hostManager.get(hostId);
    
    if (!host) {
      return res.status(404).json({
        error: {
          code: 'HOST_NOT_FOUND',
          message: `Host '${hostId}' not found`
        }
      });
    }

    if (host.status !== 'connected') {
      return res.status(503).json({
        error: {
          code: 'HOST_DISCONNECTED',
          message: `Host '${hostId}' is not connected`
        }
      });
    }

    if (!host.swarmActive) {
      return res.status(400).json({
        error: {
          code: 'NOT_SWARM_MODE',
          message: `Host '${hostId}' is not running in Docker Swarm mode`
        }
      });
    }

    if (!host.swarmInfo?.isManager) {
      return res.status(400).json({
        error: {
          code: 'NOT_SWARM_MANAGER',
          message: 'Operation requires a Swarm manager node'
        }
      });
    }

    const services = await swarm.listSwarmServices(host.client);
    res.json({ 
      hostId,
      swarmMode: true,
      services 
    });
  } catch (error) {
    console.error(`[Hosts API] Error listing Swarm services for ${req.params.hostId}:`, error);
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

/**
 * GET /api/hosts/:hostId/swarm/nodes
 * List Swarm nodes for a specific host (must be Swarm manager)
 */
router.get('/:hostId/swarm/nodes', async (req, res) => {
  try {
    const { hostId } = req.params;
    const host = hostManager.get(hostId);
    
    if (!host) {
      return res.status(404).json({
        error: {
          code: 'HOST_NOT_FOUND',
          message: `Host '${hostId}' not found`
        }
      });
    }

    if (host.status !== 'connected') {
      return res.status(503).json({
        error: {
          code: 'HOST_DISCONNECTED',
          message: `Host '${hostId}' is not connected`
        }
      });
    }

    if (!host.swarmActive) {
      return res.status(400).json({
        error: {
          code: 'NOT_SWARM_MODE',
          message: `Host '${hostId}' is not running in Docker Swarm mode`
        }
      });
    }

    if (!host.swarmInfo?.isManager) {
      return res.status(400).json({
        error: {
          code: 'NOT_SWARM_MANAGER',
          message: 'Operation requires a Swarm manager node'
        }
      });
    }

    const nodes = await swarm.listSwarmNodes(host.client);
    res.json({ 
      hostId,
      swarmMode: true,
      nodes 
    });
  } catch (error) {
    console.error(`[Hosts API] Error listing Swarm nodes for ${req.params.hostId}:`, error);
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

/**
 * GET /api/hosts/:hostId/swarm/services/:serviceId
 * Get details for a specific Swarm service
 */
router.get('/:hostId/swarm/services/:serviceId', async (req, res) => {
  try {
    const { hostId, serviceId } = req.params;
    const host = hostManager.get(hostId);
    
    if (!host) {
      return res.status(404).json({
        error: {
          code: 'HOST_NOT_FOUND',
          message: `Host '${hostId}' not found`
        }
      });
    }

    if (host.status !== 'connected') {
      return res.status(503).json({
        error: {
          code: 'HOST_DISCONNECTED',
          message: `Host '${hostId}' is not connected`
        }
      });
    }

    if (!host.swarmActive) {
      return res.status(400).json({
        error: {
          code: 'NOT_SWARM_MODE',
          message: `Host '${hostId}' is not running in Docker Swarm mode`
        }
      });
    }

    if (!host.swarmInfo?.isManager) {
      return res.status(400).json({
        error: {
          code: 'NOT_SWARM_MANAGER',
          message: 'Operation requires a Swarm manager node'
        }
      });
    }

    const service = await swarm.getServiceDetails(host.client, serviceId);
    
    if (!service) {
      return res.status(404).json({
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: `Service '${serviceId}' not found`
        }
      });
    }

    res.json({ 
      hostId,
      service 
    });
  } catch (error) {
    console.error(`[Hosts API] Error getting service ${req.params.serviceId}:`, error);
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

/**
 * GET /api/hosts/swarm/services
 * List all Swarm services across all Swarm-enabled hosts
 */
router.get('/swarm/services', async (req, res) => {
  try {
    const swarmHosts = hostManager.getConnected().filter(h => h.swarmActive);
    
    if (swarmHosts.length === 0) {
      return res.json({
        swarmMode: false,
        message: 'No hosts are running in Docker Swarm mode',
        services: []
      });
    }

    // Query only manager nodes to avoid duplicate results from the same cluster
    const managerHosts = swarmHosts.filter(h => h.swarmInfo?.isManager);

    // Deduplicate managers by cluster ID to query only one per cluster
    const seenClusters = new Set();
    const uniqueManagerHosts = managerHosts.filter(h => {
      const clusterId = h.swarmInfo?.cluster;
      if (clusterId && seenClusters.has(clusterId)) return false;
      if (clusterId) seenClusters.add(clusterId);
      return true;
    });

    const results = await Promise.allSettled(
      uniqueManagerHosts.map(async host => {
        const services = await swarm.listSwarmServices(host.client);
        return services.map(s => ({ ...s, hostId: host.id, hostLabel: host.label }));
      })
    );
    
    const allServices = results
      .filter(r => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Final deduplication by service ID in case cluster IDs were unavailable
    const seenServiceIds = new Set();
    const deduplicatedServices = allServices.filter(s => {
      if (seenServiceIds.has(s.id)) return false;
      seenServiceIds.add(s.id);
      return true;
    });

    res.json({
      swarmMode: true,
      hostsCount: swarmHosts.length,
      services: deduplicatedServices
    });
  } catch (error) {
    console.error('[Hosts API] Error listing all Swarm services:', error);
    res.status(500).json(ERRORS.DOCKER_CONNECTION().toJSON());
  }
});

module.exports = router;
