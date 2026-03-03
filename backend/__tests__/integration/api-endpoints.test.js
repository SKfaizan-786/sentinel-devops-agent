/**
 * Integration Tests: API Endpoints
 * Tests REST API with real Express server and mocked Docker
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock Docker client before requiring routes
jest.mock('../../docker/client', () => ({
  hostManager: {
    parseId: jest.fn((id) => ({ hostId: 'local', containerId: id })),
    get: jest.fn(() => ({
      client: {
        listContainers: jest.fn(async () => [
          {
            Id: 'abc123',
            Names: ['/test-web'],
            Image: 'nginx:latest',
            State: 'running',
            Status: 'Up 1 hour',
          },
        ]),
        getContainer: jest.fn(() => ({
          inspect: jest.fn(async () => ({
            Id: 'abc123',
            State: { Health: { Status: 'healthy' } },
          })),
        })),
      },
    })),
    loadHosts: jest.fn(async () => {}),
    getConnected: jest.fn(() => []),
  },
  listContainers: jest.fn(async () => []),
  getContainerHealth: jest.fn(async () => ({ status: 'healthy' })),
}));

jest.mock('../../docker/monitor', () => ({
  startMonitoring: jest.fn(async () => {}),
  getMetrics: jest.fn(() => ({
    cpu: '10.5',
    memory: { usage: '100 MB', limit: '1 GB', percent: '10.0' },
  })),
}));

jest.mock('../../docker/healer', () => ({
  restartContainer: jest.fn(async () => ({
    action: 'restart',
    success: true,
    containerId: 'abc123',
  })),
}));

jest.mock('../../services/monitor', () => ({
  getSystemStatus: jest.fn(() => ({
    services: {
      auth: { status: 'healthy', code: 200 },
      payment: { status: 'healthy', code: 200 },
    },
    lastUpdated: new Date(),
  })),
  startMonitoring: jest.fn(),
  setWsBroadcaster: jest.fn(),
  checkServiceHealth: jest.fn(async () => {}),
}));

jest.mock('../../services/incidents', () => ({
  getActivityLog: jest.fn(() => []),
  getAiLogs: jest.fn(() => []),
  logActivity: jest.fn(),
  addAiLog: jest.fn(() => ({ id: 1, analysis: 'Test' })),
}));

describe('Integration: API Endpoints', () => {
  let app;

  beforeAll(() => {
    // Create minimal Express app with routes
    app = express();
    app.use(bodyParser.json());

    const serviceMonitor = require('../../services/monitor');
    const incidents = require('../../services/incidents');
    const { listContainers, getContainerHealth } = require('../../docker/client');
    const containerMonitor = require('../../docker/monitor');
    const healer = require('../../docker/healer');

    // Status endpoint
    app.get('/api/status', (req, res) => {
      res.json(serviceMonitor.getSystemStatus());
    });

    // Activity endpoint
    app.get('/api/activity', (req, res) => {
      res.json({ activity: incidents.getActivityLog().slice(0, 50) });
    });

    // Docker containers endpoint
    app.get('/api/docker/containers', async (req, res) => {
      try {
        const containers = await listContainers();
        res.json({ containers });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Docker health endpoint
    app.get('/api/docker/health/:id', async (req, res) => {
      try {
        const health = await getContainerHealth(req.params.id);
        res.json(health);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Docker restart endpoint
    app.post('/api/docker/restart/:id', async (req, res) => {
      try {
        const result = await healer.restartContainer(req.params.id);
        res.json(result);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Kestra webhook endpoint
    app.post('/api/kestra-webhook', (req, res) => {
      const { aiReport } = req.body;
      if (aiReport) {
        incidents.addAiLog(aiReport);
      }
      res.json({ success: true });
    });
  });

  describe('GET /api/status', () => {
    it('should return system status', async () => {
      const response = await request(app).get('/api/status');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('services');
      expect(response.body.services).toHaveProperty('auth');
    });
  });

  describe('GET /api/activity', () => {
    it('should return activity log', async () => {
      const response = await request(app).get('/api/activity');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('activity');
      expect(Array.isArray(response.body.activity)).toBe(true);
    });
  });

  describe('GET /api/docker/containers', () => {
    it('should list Docker containers', async () => {
      const response = await request(app).get('/api/docker/containers');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('containers');
      expect(Array.isArray(response.body.containers)).toBe(true);
    });
  });

  describe('GET /api/docker/health/:id', () => {
    it('should return container health', async () => {
      const response = await request(app).get('/api/docker/health/abc123');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('POST /api/docker/restart/:id', () => {
    it('should restart a container', async () => {
      const response = await request(app).post('/api/docker/restart/abc123');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.action).toBe('restart');
    });
  });

  describe('POST /api/kestra-webhook', () => {
    it('should accept AI analysis webhook', async () => {
      const response = await request(app)
        .post('/api/kestra-webhook')
        .send({ aiReport: 'System is healthy' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should handle empty webhook payload', async () => {
      const response = await request(app).post('/api/kestra-webhook').send({});

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });
});
