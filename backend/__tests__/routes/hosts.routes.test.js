/**
 * Hosts Routes Integration Tests
 * 
 * Tests for multi-host Docker management API endpoints
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock the docker client module
jest.mock('../../docker/client', () => {
  const mockHosts = new Map();
  
  // Set up some mock hosts
  mockHosts.set('local', {
    id: 'local',
    label: 'Local Docker',
    type: 'local',
    status: 'connected',
    swarmActive: false,
    swarmInfo: null,
    dockerVersion: '24.0.5',
    containers: 5,
    containersRunning: 3,
    containersPaused: 0,
    containersStopped: 2,
    images: 10,
    memoryTotal: 16 * 1024 * 1024 * 1024, // 16 GB
    cpuCount: 8,
    lastChecked: new Date(),
    client: {
      ping: jest.fn().mockResolvedValue(true),
      info: jest.fn().mockResolvedValue({
        ServerVersion: '24.0.5',
        Containers: 5,
        ContainersRunning: 3,
        NCPU: 8,
        MemTotal: 16 * 1024 * 1024 * 1024
      }),
      listServices: jest.fn().mockResolvedValue([]),
      listNodes: jest.fn().mockResolvedValue([])
    }
  });
  
  mockHosts.set('prod-1', {
    id: 'prod-1',
    label: 'Production Primary',
    type: 'remote',
    status: 'connected',
    swarmActive: true,
    swarmInfo: {
      nodeId: 'node123',
      nodeAddr: '192.168.1.100',
      isManager: true,
      nodes: 3,
      managers: 1,
      cluster: 'cluster-abc'
    },
    dockerVersion: '24.0.6',
    containers: 15,
    containersRunning: 12,
    containersPaused: 0,
    containersStopped: 3,
    images: 25,
    memoryTotal: 64 * 1024 * 1024 * 1024, // 64 GB
    cpuCount: 16,
    lastChecked: new Date(),
    client: {
      ping: jest.fn().mockResolvedValue(true),
      info: jest.fn().mockResolvedValue({
        ServerVersion: '24.0.6',
        Containers: 15,
        ContainersRunning: 12,
        NCPU: 16,
        MemTotal: 64 * 1024 * 1024 * 1024,
        Swarm: { LocalNodeState: 'active' }
      }),
      listServices: jest.fn().mockResolvedValue([
        {
          ID: 'svc1',
          Spec: {
            Name: 'web-app',
            Mode: { Replicated: { Replicas: 3 } },
            TaskTemplate: { ContainerSpec: { Image: 'nginx:latest' } }
          },
          UpdateStatus: { State: 'completed' }
        }
      ]),
      listNodes: jest.fn().mockResolvedValue([
        {
          ID: 'node1',
          Description: { Hostname: 'manager-1', Engine: { EngineVersion: '24.0.6' }, Platform: { OS: 'linux', Architecture: 'x86_64' } },
          Spec: { Role: 'manager', Availability: 'active' },
          Status: { State: 'ready', Addr: '192.168.1.100' },
          ManagerStatus: { Leader: true }
        }
      ])
    }
  });
  
  mockHosts.set('staging', {
    id: 'staging',
    label: 'Staging Server',
    type: 'remote',
    status: 'disconnected',
    error: 'Connection refused',
    lastChecked: new Date(),
    client: null
  });

  // Swarm worker node (connected but not a manager)
  mockHosts.set('worker-1', {
    id: 'worker-1',
    label: 'Worker Node 1',
    type: 'remote',
    status: 'connected',
    swarmActive: true,
    swarmInfo: {
      nodeId: 'node456',
      nodeAddr: '192.168.1.101',
      isManager: false,
      nodes: 3,
      managers: 1,
      cluster: 'cluster-abc'
    },
    dockerVersion: '24.0.6',
    containers: 8,
    containersRunning: 6,
    containersPaused: 0,
    containersStopped: 2,
    images: 15,
    memoryTotal: 32 * 1024 * 1024 * 1024,
    cpuCount: 8,
    lastChecked: new Date(),
    client: {
      ping: jest.fn().mockResolvedValue(true),
      info: jest.fn().mockResolvedValue({
        ServerVersion: '24.0.6',
        Containers: 8,
        ContainersRunning: 6,
        NCPU: 8,
        MemTotal: 32 * 1024 * 1024 * 1024,
        Swarm: { LocalNodeState: 'active' }
      }),
      listServices: jest.fn().mockResolvedValue([]),
      listNodes: jest.fn().mockResolvedValue([])
    }
  });

  return {
    docker: {},
    hostManager: {
      initialized: true,
      hosts: mockHosts,
      getAll: jest.fn(() => [...mockHosts.values()]),
      get: jest.fn((id) => mockHosts.get(id)),
      getConnected: jest.fn(() => [...mockHosts.values()].filter(h => h.status === 'connected')),
      getClient: jest.fn((id) => mockHosts.get(id)?.client),
      refreshAll: jest.fn().mockResolvedValue(undefined),
      parseId: jest.fn((compoundId) => {
        if (!compoundId || typeof compoundId !== 'string') {
          return { hostId: 'local', containerId: compoundId || '' };
        }
        const colonIndex = compoundId.indexOf(':');
        if (colonIndex === -1) {
          return { hostId: 'local', containerId: compoundId };
        }
        return {
          hostId: compoundId.substring(0, colonIndex),
          containerId: compoundId.substring(colonIndex + 1)
        };
      }),
      createCompoundId: jest.fn((hostId, containerId) => `${hostId}:${containerId}`)
    },
    listContainers: jest.fn().mockResolvedValue([]),
    getContainerHealth: jest.fn().mockResolvedValue({ status: 'healthy', failingStreak: 0, log: [] })
  };
});

// Mock swarm module
jest.mock('../../docker/swarm', () => ({
  isSwarmMode: jest.fn().mockResolvedValue(true),
  getSwarmInfo: jest.fn().mockResolvedValue({
    nodeId: 'node123',
    isManager: true,
    nodes: 3
  }),
  listSwarmServices: jest.fn().mockResolvedValue([
    {
      id: 'svc1',
      name: 'web-app',
      replicas: 3,
      isGlobal: false,
      image: 'nginx:latest',
      state: 'completed'
    }
  ]),
  listSwarmNodes: jest.fn().mockResolvedValue([
    {
      id: 'node1',
      hostname: 'manager-1',
      role: 'manager',
      availability: 'active',
      state: 'ready',
      isManager: true,
      isLeader: true
    }
  ]),
  getServiceDetails: jest.fn().mockResolvedValue({
    id: 'svc1',
    name: 'web-app',
    replicas: 3,
    tasks: { total: 3, running: 3, failed: 0 }
  })
}));

// Mock errors
jest.mock('../../lib/errors', () => ({
  ERRORS: {
    DOCKER_CONNECTION: () => ({
      toJSON: () => ({ error: { code: 'DOCKER_CONNECTION', message: 'Docker connection error' } })
    })
  }
}));

const hostsRoutes = require('../../routes/hosts.routes');

// Create test app
const createApp = () => {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/hosts', hostsRoutes);
  return app;
};

describe('Hosts Routes - Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  describe('GET /api/hosts - List all hosts', () => {
    it('should return all configured hosts', async () => {
      const response = await request(app)
        .get('/api/hosts')
        .expect(200);

      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('connected');
      expect(response.body).toHaveProperty('hosts');
      expect(Array.isArray(response.body.hosts)).toBe(true);
      expect(response.body.total).toBe(4);
      expect(response.body.connected).toBe(3);
    });

    it('should include host details in response', async () => {
      const response = await request(app)
        .get('/api/hosts')
        .expect(200);

      const localHost = response.body.hosts.find(h => h.id === 'local');
      expect(localHost).toBeDefined();
      expect(localHost).toHaveProperty('label', 'Local Docker');
      expect(localHost).toHaveProperty('status', 'connected');
      expect(localHost).toHaveProperty('containersRunning', 3);
      expect(localHost).toHaveProperty('cpuCount', 8);
    });

    it('should show disconnected hosts with error', async () => {
      const response = await request(app)
        .get('/api/hosts')
        .expect(200);

      const stagingHost = response.body.hosts.find(h => h.id === 'staging');
      expect(stagingHost).toBeDefined();
      expect(stagingHost.status).toBe('disconnected');
      expect(stagingHost.error).toBe('Connection refused');
    });

    it('should include Swarm info for Swarm-enabled hosts', async () => {
      const response = await request(app)
        .get('/api/hosts')
        .expect(200);

      const prodHost = response.body.hosts.find(h => h.id === 'prod-1');
      expect(prodHost).toBeDefined();
      expect(prodHost.swarmActive).toBe(true);
      expect(prodHost.swarmInfo).toBeDefined();
      expect(prodHost.swarmInfo.isManager).toBe(true);
    });
  });

  describe('GET /api/hosts/:hostId - Get specific host', () => {
    it('should return details for a specific host', async () => {
      const response = await request(app)
        .get('/api/hosts/local')
        .expect(200);

      expect(response.body).toHaveProperty('id', 'local');
      expect(response.body).toHaveProperty('label', 'Local Docker');
      expect(response.body).toHaveProperty('status', 'connected');
    });

    it('should return 404 for non-existent host', async () => {
      const response = await request(app)
        .get('/api/hosts/non-existent')
        .expect(404);

      expect(response.body.error.code).toBe('HOST_NOT_FOUND');
    });
  });

  describe('POST /api/hosts/refresh - Refresh all hosts', () => {
    it('should refresh all host connections', async () => {
      const { hostManager } = require('../../docker/client');
      
      const response = await request(app)
        .post('/api/hosts/refresh')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('All hosts refreshed');
      expect(hostManager.refreshAll).toHaveBeenCalled();
    });
  });

  describe('GET /api/hosts/:hostId/swarm/services - List Swarm services', () => {
    it('should return Swarm services for a Swarm-enabled host', async () => {
      const response = await request(app)
        .get('/api/hosts/prod-1/swarm/services')
        .expect(200);

      expect(response.body.hostId).toBe('prod-1');
      expect(response.body.swarmMode).toBe(true);
      expect(Array.isArray(response.body.services)).toBe(true);
    });

    it('should return 400 for non-Swarm host', async () => {
      const response = await request(app)
        .get('/api/hosts/local/swarm/services')
        .expect(400);

      expect(response.body.error.code).toBe('NOT_SWARM_MODE');
    });

    it('should return 503 for disconnected host', async () => {
      const response = await request(app)
        .get('/api/hosts/staging/swarm/services')
        .expect(503);

      expect(response.body.error.code).toBe('HOST_DISCONNECTED');
    });

    it('should return 404 for non-existent host', async () => {
      const response = await request(app)
        .get('/api/hosts/unknown/swarm/services')
        .expect(404);

      expect(response.body.error.code).toBe('HOST_NOT_FOUND');
    });

    it('should return 400 for Swarm worker node (not a manager)', async () => {
      const response = await request(app)
        .get('/api/hosts/worker-1/swarm/services')
        .expect(400);

      expect(response.body.error.code).toBe('NOT_SWARM_MANAGER');
    });
  });

  describe('GET /api/hosts/:hostId/swarm/nodes - List Swarm nodes', () => {
    it('should return Swarm nodes for a Swarm-enabled host', async () => {
      const response = await request(app)
        .get('/api/hosts/prod-1/swarm/nodes')
        .expect(200);

      expect(response.body.hostId).toBe('prod-1');
      expect(response.body.swarmMode).toBe(true);
      expect(Array.isArray(response.body.nodes)).toBe(true);
    });

    it('should return 400 for Swarm worker node (not a manager)', async () => {
      const response = await request(app)
        .get('/api/hosts/worker-1/swarm/nodes')
        .expect(400);

      expect(response.body.error.code).toBe('NOT_SWARM_MANAGER');
    });
  });

  describe('GET /api/hosts/:hostId/swarm/services/:serviceId - Get Swarm service details', () => {
    it('should return 400 for Swarm worker node (not a manager)', async () => {
      const response = await request(app)
        .get('/api/hosts/worker-1/swarm/services/svc1')
        .expect(400);

      expect(response.body.error.code).toBe('NOT_SWARM_MANAGER');
    });
  });
});

describe('DockerHostManager - Unit Tests', () => {
  const { hostManager } = require('../../docker/client');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('parseId', () => {
    it('should parse compound IDs correctly', () => {
      const result = hostManager.parseId('prod-1:abc123');
      expect(result.hostId).toBe('prod-1');
      expect(result.containerId).toBe('abc123');
    });

    it('should default to local for simple IDs', () => {
      const result = hostManager.parseId('abc123');
      expect(result.hostId).toBe('local');
      expect(result.containerId).toBe('abc123');
    });

    it('should handle null/undefined gracefully', () => {
      const result = hostManager.parseId(null);
      expect(result.hostId).toBe('local');
      expect(result.containerId).toBe('');
    });
  });

  describe('createCompoundId', () => {
    it('should create compound ID correctly', () => {
      const result = hostManager.createCompoundId('prod-1', 'abc123');
      expect(result).toBe('prod-1:abc123');
    });
  });

  describe('getConnected', () => {
    it('should return only connected hosts', () => {
      const connected = hostManager.getConnected();
      expect(connected.length).toBe(3);
      expect(connected.every(h => h.status === 'connected')).toBe(true);
    });
  });

  describe('getAll', () => {
    it('should return all hosts including disconnected', () => {
      const all = hostManager.getAll();
      expect(all.length).toBe(4);
    });
  });
});
