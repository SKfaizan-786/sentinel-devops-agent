/**
 * Security Routes Integration Tests
 * 
 * Tests for Docker image scanning, compliance checking,
 * security policy management, and container monitoring.
 */

const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// Mock dependencies
jest.mock('../../security/scanner', () => ({
  scanImage: jest.fn(async (imageId) => {
    return {
      imageId,
      scannedAt: new Date().toISOString(),
      vulnerabilities: [],
      severity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      status: 'passed',
    };
  }),

  startScanner: jest.fn(async () => {
    return { status: 'started' };
  }),

  clearCache: jest.fn(() => {
    return { status: 'cleared' };
  }),
}));

jest.mock('../../security/policies', () => ({
  getPolicy: jest.fn(() => {
    return {
      allowedSeverities: ['low', 'medium'],
      blockedImages: [],
      scanFrequency: '1h',
    };
  }),

  updatePolicy: jest.fn((newPolicy) => {
    return newPolicy;
  }),

  checkCompliance: jest.fn((scanResult) => {
    return {
      compliant: true,
      violations: [],
      advice: '',
    };
  }),
}));

jest.mock('../../docker/monitor', () => ({
  monitorContainers: jest.fn(async () => {
    return { status: 'monitoring' };
  }),

  getContainerMetrics: jest.fn(async () => {
    return [];
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
      permissions: ['security:read', 'security:write'],
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
const securityRoutes = require('../../routes/security.routes');

function setupApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use('/api/security', securityRoutes);
  return app;
}

describe('Security Routes - Docker & Compliance Tests', () => {
  let app;

  beforeEach(() => {
    app = setupApp();
    jest.clearAllMocks();
  });

  describe('GET /api/security/scan - Scan Docker image', () => {
    it('should scan a Docker image by imageId', async () => {
      const scanner = require('../security/scanner');

      const response = await request(app)
        .get('/api/security/scan?imageId=docker.io/nginx:latest')
        .expect(200);

      expect(response.body).toHaveProperty('imageId');
      expect(response.body).toHaveProperty('scannedAt');
      expect(response.body).toHaveProperty('vulnerabilities');
      expect(response.body).toHaveProperty('severity');
      expect(scanner.scanImage).toHaveBeenCalledWith('docker.io/nginx:latest');
    });

    it('should return 400 when imageId is missing', async () => {
      const response = await request(app)
        .get('/api/security/scan')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('imageId');
    });

    it('should handle scanner errors gracefully', async () => {
      const scanner = require('../security/scanner');
      scanner.scanImage.mockRejectedValueOnce(new Error('Scanner unavailable'));

      const response = await request(app)
        .get('/api/security/scan?imageId=nginx:latest')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should support scanning images with complex names', async () => {
      const scanner = require('../security/scanner');

      const imageId = 'gcr.io/my-project/my-app:v1.2.3';
      await request(app)
        .get(`/api/security/scan?imageId=${encodeURIComponent(imageId)}`)
        .expect(200);

      expect(scanner.scanImage).toHaveBeenCalledWith(imageId);
    });

    it('should return scan results with vulnerability count', async () => {
      const scanner = require('../security/scanner');
      scanner.scanImage.mockResolvedValueOnce({
        imageId: 'test:latest',
        scannedAt: new Date().toISOString(),
        vulnerabilities: [
          { id: 'CVE-123', severity: 'high' },
          { id: 'CVE-456', severity: 'medium' },
        ],
        severity: {
          critical: 0,
          high: 1,
          medium: 1,
          low: 0,
        },
        status: 'failed',
      });

      const response = await request(app)
        .get('/api/security/scan?imageId=test:latest')
        .expect(200);

      expect(response.body.vulnerabilities.length).toBe(2);
      expect(response.body.severity.high).toBe(1);
      expect(response.body.status).toBe('failed');
    });
  });

  describe('GET /api/security/compliance - Check compliance', () => {
    it('should check image compliance with policy', async () => {
      const scanner = require('../security/scanner');
      const policies = require('../security/policies');

      const response = await request(app)
        .get('/api/security/compliance?imageId=docker.io/nginx:latest')
        .expect(200);

      expect(response.body).toHaveProperty('compliant');
      expect(response.body).toHaveProperty('violations');
      expect(response.body).toHaveProperty('advice');
      expect(response.body).toHaveProperty('scannedAt');

      expect(scanner.scanImage).toHaveBeenCalled();
      expect(policies.checkCompliance).toHaveBeenCalled();
    });

    it('should return 400 when imageId is missing', async () => {
      const response = await request(app)
        .get('/api/security/compliance')
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should indicate non-compliance when violations exist', async () => {
      const policies = require('../security/policies');
      policies.checkCompliance.mockReturnValueOnce({
        compliant: false,
        violations: [
          { rule: 'blockedImage', message: 'Image is on blocklist' },
          { rule: 'criticalVulnerability', message: 'Critical vulnerability found' },
        ],
        advice: 'Use a different base image',
      });

      const response = await request(app)
        .get('/api/security/compliance?imageId=test:latest')
        .expect(200);

      expect(response.body.compliant).toBe(false);
      expect(response.body.violations.length).toBe(2);
    });

    it('should handle scanner errors gracefully', async () => {
      const scanner = require('../security/scanner');
      scanner.scanImage.mockRejectedValueOnce(new Error('Network error'));

      const response = await request(app)
        .get('/api/security/compliance?imageId=test:latest')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/security/policies - Get security policies', () => {
    it('should return current security policies', async () => {
      const response = await request(app)
        .get('/api/security/policies')
        .expect(200);

      expect(response.body).toHaveProperty('allowedSeverities');
      expect(response.body).toHaveProperty('blockedImages');
      expect(response.body).toHaveProperty('scanFrequency');
    });

    it('should return policies with blocklist', async () => {
      const policies = require('../security/policies');
      policies.getPolicy.mockReturnValueOnce({
        allowedSeverities: ['low'],
        blockedImages: ['alpine:latest', 'scratch:latest'],
        scanFrequency: '1h',
      });

      const response = await request(app)
        .get('/api/security/policies')
        .expect(200);

      expect(response.body.blockedImages.length).toBe(2);
      expect(response.body.blockedImages).toContain('alpine:latest');
    });
  });

  describe('POST /api/security/policies - Update security policies', () => {
    it('should update security policies with write permission', async () => {
      const policies = require('../security/policies');

      const newPolicy = {
        allowedSeverities: ['low', 'medium'],
        blockedImages: ['malicious:latest'],
        scanFrequency: '30m',
      };

      const response = await request(app)
        .post('/api/security/policies')
        .set('Authorization', 'Bearer valid-token')
        .send(newPolicy)
        .expect(200);

      expect(response.body).toHaveProperty('allowedSeverities');
      expect(policies.updatePolicy).toHaveBeenCalledWith(newPolicy);
    });

    it('should require security:write permission', async () => {
      const app2 = express();
      app2.use(bodyParser.json());

      // Mock middleware without write permission
      const mockAuth = require('../auth/middleware');
      const originalRequirePermissions = mockAuth.requirePermissions;
      mockAuth.requirePermissions = (...perms) => (req, res, next) => {
        if (perms.includes('security:write')) {
          return res.status(403).json({ error: 'Insufficient permissions' });
        }
        next();
      };

      // Re-require the router to get updated middleware
      delete require.cache[require.resolve('../routes/security.routes')];
      const securityRoutes2 = require('../routes/security.routes');
      app2.use('/api/security', securityRoutes2);

      const response = await request(app2)
        .post('/api/security/policies')
        .set('Authorization', 'Bearer valid-token')
        .send({ allowedSeverities: ['low'] })
        .expect(403);

      expect(response.body).toHaveProperty('error');

      // Restore
      mockAuth.requirePermissions = originalRequirePermissions;
    });

    it('should handle policy validation errors', async () => {
      const policies = require('../security/policies');
      policies.updatePolicy.mockImplementationOnce(() => {
        throw new Error('Invalid policy format');
      });

      const response = await request(app)
        .post('/api/security/policies')
        .set('Authorization', 'Bearer valid-token')
        .send({ allowedSeverities: 'invalid' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should accept blocklist in policy update', async () => {
      const policies = require('../security/policies');

      const newPolicy = {
        allowedSeverities: ['low'],
        blockedImages: ['ubuntu:latest', 'debian:latest'],
        scanFrequency: '2h',
      };

      await request(app)
        .post('/api/security/policies')
        .set('Authorization', 'Bearer valid-token')
        .send(newPolicy)
        .expect(200);

      expect(policies.updatePolicy).toHaveBeenCalledWith(
        expect.objectContaining({
          blockedImages: expect.arrayContaining(['ubuntu:latest', 'debian:latest']),
        })
      );
    });
  });

  describe('POST /api/security/scan-all - Scan all containers', () => {
    it('should return 501 not implemented', async () => {
      const response = await request(app)
        .post('/api/security/scan-all')
        .expect(501);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not implemented');
    });

    it('should accept force parameter', async () => {
      const response = await request(app)
        .post('/api/security/scan-all?force=true')
        .expect(501);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Security Route Error Handling', () => {
    it('should handle missing authentication for protected endpoints', async () => {
      const response = await request(app)
        .post('/api/security/policies')
        .send({ allowedSeverities: ['low'] })
        .expect(401);

      expect(response.body).toHaveProperty('error');
    });

    it('should return consistent error format', async () => {
      const response = await request(app)
        .get('/api/security/scan')
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(typeof response.body.error).toBe('string');
    });

    it('should handle concurrent scan requests', async () => {
      const scanner = require('../security/scanner');

      const promises = [
        request(app).get('/api/security/scan?imageId=image1:latest'),
        request(app).get('/api/security/scan?imageId=image2:latest'),
        request(app).get('/api/security/scan?imageId=image3:latest'),
      ];

      const results = await Promise.all(promises);

      results.forEach((response) => {
        expect(response.status).toBe(200);
      });

      expect(scanner.scanImage).toHaveBeenCalledTimes(3);
    });
  });

  describe('Integration: Scan + Compliance Check', () => {
    it('should perform scan and compliance check together', async () => {
      const scanner = require('../security/scanner');
      const policies = require('../security/policies');

      scanner.scanImage.mockResolvedValueOnce({
        imageId: 'test:latest',
        scannedAt: new Date().toISOString(),
        vulnerabilities: [],
        severity: { critical: 0, high: 0, medium: 0, low: 0 },
        status: 'passed',
      });

      policies.checkCompliance.mockReturnValueOnce({
        compliant: true,
        violations: [],
        advice: '',
      });

      // Scan first
      const scanResponse = await request(app)
        .get('/api/security/scan?imageId=test:latest')
        .expect(200);

      // Then check compliance
      const complianceResponse = await request(app)
        .get('/api/security/compliance?imageId=test:latest')
        .expect(200);

      expect(scanResponse.body.status).toBe('passed');
      expect(complianceResponse.body.compliant).toBe(true);
    });
  });
});
