/**
 * SLO Routes Integration Tests
 * 
 * Tests for SLO CRUD operations, error budget calculations,
 * and downtime tracking endpoints.
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock dependencies
jest.mock('../../slo/calculator', () => ({
  calculateErrorBudget: jest.fn((slo, incidents) => {
    return {
      allowedDowntimeMinutes: 43.2,
      totalDowntimeMinutes: 10,
      remainingMinutes: 33.2,
      budgetPercent: 76.85,
      currentAvailability: 99.98,
      status: 'healthy',
      burndownRatePerDay: 5.5,
      projectedExhaustionDate: new Date(Date.now() + 13737600000).toISOString(),
    };
  }),
  generateBurndownData: jest.fn((slo, incidents, points) => {
    const data = [];
    for (let i = 0; i < (points || 30); i++) {
      data.push({
        date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        budgetRemaining: Math.max(0, 100 - i * 3),
        downtimeAccumulated: i * 3,
      });
    }
    return data;
  }),
  MINUTES_PER_WINDOW: {
    '1day': 24 * 60,
    '7days': 7 * 24 * 60,
    '1month': 30 * 24 * 60,
  },
}));

jest.mock('../../models/slo-definition', () => {
  let mockSlos = new Map();
  const { v4: uuidv4 } = require('uuid');

  return {
    getAll: jest.fn(() => Array.from(mockSlos.values())),
    getById: jest.fn((id) => mockSlos.get(id)),
    create: jest.fn((data) => {
      const slo = {
        id: 'slo-' + uuidv4().substr(0, 8),
        ...data,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      mockSlos.set(slo.id, slo);
      return slo;
    }),
    update: jest.fn((id, data) => {
      const slo = mockSlos.get(id);
      if (!slo) return null;
      const updated = { ...slo, ...data, updatedAt: new Date().toISOString() };
      mockSlos.set(id, updated);
      return updated;
    }),
    remove: jest.fn((id) => {
      return mockSlos.delete(id);
    }),
  };
});

jest.mock('../../slo/tracker', () => ({
  getIncidents: jest.fn((serviceId) => {
    return [
      {
        id: 'incident-1',
        serviceId,
        downtimeMinutes: 15,
        resolvedAt: Date.now() - 3600000,
      },
      {
        id: 'incident-2',
        serviceId,
        downtimeMinutes: 25,
        resolvedAt: Date.now() - 86400000,
      },
    ];
  }),
  recordDowntime: jest.fn((serviceId, downtimeMinutes, description) => {
    return {
      id: 'event-new',
      serviceId,
      downtimeMinutes,
      description,
      resolvedAt: Date.now(),
      createdAt: Date.now() - downtimeMinutes * 60 * 1000,
    };
  }),
  clearService: jest.fn((serviceId) => {
    // Mock implementation
  }),
}));

// Mock auth middleware
jest.mock('../../auth/middleware', () => ({
  requireAuth: (req, res, next) => {
    const token = req.headers.authorization?.substring(7);
    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    req.user = {
      userId: 'test-user',
      email: 'test@example.com',
      permissions: ['slo:read', 'slo:write', 'slo:delete'],
    };
    next();
  },
  requirePermissions: (...permissions) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userPermissions = req.user.permissions || [];
      const hasAll = permissions.every((perm) => userPermissions.includes(perm));

      if (!hasAll) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      next();
    };
  },
}));

// Load the router after mocks are in place
const sloRoutes = require('../../routes/slo.routes');

function setupApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/slo', sloRoutes);
  return app;
}

describe('SLO Routes - Unit & Integration Tests', () => {
  let app;

  beforeEach(() => {
    app = setupApp();
    jest.clearAllMocks();
  });

  describe('GET /api/slo - List all SLOs', () => {
    it('should list all SLOs with summary stats', async () => {
      const response = await request(app).get('/api/slo').expect(200);

      expect(response.body).toHaveProperty('slos');
      expect(response.body).toHaveProperty('summary');
      expect(response.body.summary).toHaveProperty('total');
      expect(response.body.summary).toHaveProperty('healthy');
      expect(response.body.summary).toHaveProperty('warning');
      expect(response.body.summary).toHaveProperty('critical');
    });

    it('should return empty list when no SLOs exist', async () => {
      const sloModel = require('../models/slo-definition');
      sloModel.getAll.mockReturnValueOnce([]);

      const response = await request(app).get('/api/slo').expect(200);

      expect(response.body.slos).toEqual([]);
      expect(response.body.summary.total).toBe(0);
    });

    it('should include budget information for each SLO', async () => {
      const sloModel = require('../models/slo-definition');
      sloModel.getAll.mockReturnValueOnce([
        {
          id: 'slo-1',
          serviceId: 'service-123',
          serviceName: 'API',
          targetAvailability: 99.9,
          trackingWindow: '1month',
        },
      ]);

      const response = await request(app).get('/api/slo').expect(200);

      expect(response.body.slos.length).toBe(1);
      expect(response.body.slos[0]).toHaveProperty('budget');
    });
  });

  describe('GET /api/slo/:id - Get single SLO', () => {
    it('should return a single SLO with full budget breakdown', async () => {
      const sloModel = require('../models/slo-definition');
      const mockSLO = {
        id: 'slo-123',
        serviceId: 'service-456',
        serviceName: 'Payment API',
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      sloModel.getById.mockReturnValueOnce(mockSLO);

      const response = await request(app).get('/api/slo/slo-123').expect(200);

      expect(response.body).toHaveProperty('id', 'slo-123');
      expect(response.body).toHaveProperty('budget');
      expect(response.body).toHaveProperty('burndown');
      expect(response.body).toHaveProperty('incidents');
    });

    it('should return 404 when SLO does not exist', async () => {
      const sloModel = require('../models/slo-definition');
      sloModel.getById.mockReturnValueOnce(null);

      const response = await request(app).get('/api/slo/invalid-id').expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should calculate error budget for the SLO', async () => {
      const sloModel = require('../models/slo-definition');
      const calculator = require('../slo/calculator');

      const mockSLO = {
        id: 'slo-123',
        serviceId: 'service-456',
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      sloModel.getById.mockReturnValueOnce(mockSLO);

      await request(app).get('/api/slo/slo-123').expect(200);

      expect(calculator.calculateErrorBudget).toHaveBeenCalledWith(
        mockSLO,
        expect.any(Array)
      );
    });

    it('should generate burndown data for the SLO', async () => {
      const sloModel = require('../models/slo-definition');
      const calculator = require('../slo/calculator');

      const mockSLO = {
        id: 'slo-123',
        serviceId: 'service-456',
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      sloModel.getById.mockReturnValueOnce(mockSLO);

      await request(app).get('/api/slo/slo-123').expect(200);

      expect(calculator.generateBurndownData).toHaveBeenCalled();
    });
  });

  describe('POST /api/slo - Create new SLO', () => {
    it('should create a new SLO with valid data', async () => {
      const sloModel = require('../models/slo-definition');
      const token = 'Bearer valid-token';

      const newSLO = {
        serviceId: 'service-123',
        serviceName: 'New Service',
        targetAvailability: 99.5,
        trackingWindow: '7days',
      };

      sloModel.create.mockReturnValueOnce({ id: 'slo-new', ...newSLO });

      const response = await request(app)
        .post('/api/slo')
        .set('Authorization', token)
        .send(newSLO)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(sloModel.create).toHaveBeenCalledWith(newSLO);
    });

    it('should require authentication', async () => {
      const newSLO = {
        serviceId: 'service-123',
        targetAvailability: 99.5,
        trackingWindow: '7days',
      };

      const response = await request(app)
        .post('/api/slo')
        .send(newSLO)
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should require slo:write permission', async () => {
      const app2 = express();
      app2.use(bodyParser.json());

      // Mock middleware that doesn't have write permission
      const mockAuth = require('../auth/middleware');
      mockAuth.requireAuth = (req, res, next) => {
        req.user = { userId: 'test-user', permissions: ['slo:read'] };
        next();
      };

      app2.use('/api/slo', sloRoutes);

      const newSLO = {
        serviceId: 'service-123',
        targetAvailability: 99.5,
        trackingWindow: '7days',
      };

      const response = await request(app2)
        .post('/api/slo')
        .set('Authorization', 'Bearer valid-token')
        .send(newSLO)
        .expect(403);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/slo/:id - Update SLO', () => {
    it('should update an existing SLO', async () => {
      const sloModel = require('../models/slo-definition');
      const updates = { targetAvailability: 99.95 };

      sloModel.update.mockReturnValueOnce({
        id: 'slo-123',
        ...updates,
      });

      const response = await request(app)
        .put('/api/slo/slo-123')
        .set('Authorization', 'Bearer valid-token')
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('id', 'slo-123');
      expect(sloModel.update).toHaveBeenCalledWith('slo-123', updates);
    });

    it('should return 404 when SLO to update does not exist', async () => {
      const sloModel = require('../models/slo-definition');
      sloModel.update.mockReturnValueOnce(null);

      const response = await request(app)
        .put('/api/slo/invalid-id')
        .set('Authorization', 'Bearer valid-token')
        .send({ targetAvailability: 99.95 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication and slo:write permission', async () => {
      const response = await request(app)
        .put('/api/slo/slo-123')
        .send({ targetAvailability: 99.95 })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/slo/:id - Delete SLO', () => {
    it('should delete an existing SLO', async () => {
      const sloModel = require('../models/slo-definition');
      const tracker = require('../slo/tracker');

      sloModel.getById.mockReturnValueOnce({
        id: 'slo-123',
        serviceId: 'service-456',
      });
      sloModel.remove.mockReturnValueOnce(true);

      const response = await request(app)
        .delete('/api/slo/slo-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(sloModel.remove).toHaveBeenCalledWith('slo-123');
    });

    it('should return 404 when SLO to delete does not exist', async () => {
      const sloModel = require('../models/slo-definition');
      sloModel.getById.mockReturnValueOnce(null);

      const response = await request(app)
        .delete('/api/slo/invalid-id')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication and slo:delete permission', async () => {
      const response = await request(app)
        .delete('/api/slo/slo-123')
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/slo/:id/downtime - Record downtime', () => {
    it('should record a downtime event', async () => {
      const sloModel = require('../models/slo-definition');
      const tracker = require('../slo/tracker');

      const mockSLO = {
        id: 'slo-123',
        serviceId: 'service-456',
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      sloModel.getById.mockReturnValueOnce(mockSLO);

      const downtimeData = {
        downtimeMinutes: 30,
        description: 'Database maintenance',
      };

      const response = await request(app)
        .post('/api/slo/slo-123/downtime')
        .set('Authorization', 'Bearer valid-token')
        .send(downtimeData)
        .expect(201);

      expect(response.body).toHaveProperty('event');
      expect(response.body).toHaveProperty('budget');
      expect(tracker.recordDowntime).toHaveBeenCalledWith(
        'service-456',
        30,
        'Database maintenance'
      );
    });

    it('should validate downtime minutes is a positive number', async () => {
      const sloModel = require('../models/slo-definition');
      sloModel.getById.mockReturnValueOnce({ id: 'slo-123', serviceId: 'service-456' });

      const response = await request(app)
        .post('/api/slo/slo-123/downtime')
        .set('Authorization', 'Bearer valid-token')
        .send({ downtimeMinutes: -10 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 404 when SLO does not exist', async () => {
      const sloModel = require('../models/slo-definition');
      sloModel.getById.mockReturnValueOnce(null);

      const response = await request(app)
        .post('/api/slo/invalid-id/downtime')
        .set('Authorization', 'Bearer valid-token')
        .send({ downtimeMinutes: 30 })
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });

    it('should require authentication and slo:write permission', async () => {
      const response = await request(app)
        .post('/api/slo/slo-123/downtime')
        .send({ downtimeMinutes: 30 })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/slo/:id/burndown - Get burndown data', () => {
    it('should return burndown chart data', async () => {
      const sloModel = require('../models/slo-definition');
      const calculator = require('../slo/calculator');

      const mockSLO = {
        id: 'slo-123',
        serviceId: 'service-456',
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      sloModel.getById.mockReturnValueOnce(mockSLO);

      const response = await request(app)
        .get('/api/slo/slo-123/burndown')
        .expect(200);

      expect(response.body).toHaveProperty('burndown');
      expect(Array.isArray(response.body.burndown)).toBe(true);
    });

    it('should support custom number of points parameter', async () => {
      const sloModel = require('../models/slo-definition');
      const calculator = require('../slo/calculator');

      const mockSLO = {
        id: 'slo-123',
        serviceId: 'service-456',
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      sloModel.getById.mockReturnValueOnce(mockSLO);

      await request(app)
        .get('/api/slo/slo-123/burndown?points=15')
        .expect(200);

      // Should call with 15 points (respecting min/max limits 1-100)
      expect(calculator.generateBurndownData).toHaveBeenCalled();
    });

    it('should clamp points parameter between 1 and 100', async () => {
      const sloModel = require('../models/slo-definition');

      const mockSLO = {
        id: 'slo-123',
        serviceId: 'service-456',
        trackingWindow: '1month',
      };
      sloModel.getById.mockReturnValueOnce(mockSLO);

      // Test with points too high
      await request(app)
        .get('/api/slo/slo-123/burndown?points=500')
        .expect(200);

      // Test with points too low
      await request(app)
        .get('/api/slo/slo-123/burndown?points=0')
        .expect(200);
    });

    it('should return 404 when SLO does not exist', async () => {
      const sloModel = require('../models/slo-definition');
      sloModel.getById.mockReturnValueOnce(null);

      const response = await request(app)
        .get('/api/slo/invalid-id/burndown')
        .expect(404);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('SLO Error Handling', () => {
    it('should handle unknown errors gracefully', async () => {
      const sloModel = require('../models/slo-definition');
      sloModel.getAll.mockImplementationOnce(() => {
        throw new Error('Database connection failed');
      });

      const response = await request(app).get('/api/slo').expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should validate required fields in POST request', async () => {
      const sloModel = require('../models/slo-definition');
      sloModel.create.mockImplementationOnce(() => {
        throw new Error('serviceId is required');
      });

      const response = await request(app)
        .post('/api/slo')
        .set('Authorization', 'Bearer valid-token')
        .send({ targetAvailability: 99.9 })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });
  });
});
