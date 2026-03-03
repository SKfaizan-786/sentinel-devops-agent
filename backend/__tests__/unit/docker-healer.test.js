/**
 * Unit Tests: Docker Healer
 * Tests healing logic with mocked Docker client
 */

const { MockDockerClient } = require('../mocks/docker.mock');

// Mock dependencies
jest.mock('../../docker/client', () => ({
  hostManager: {
    parseId: jest.fn((id) => ({ hostId: 'local', containerId: id })),
    get: jest.fn(() => ({ client: MockDockerClient.docker })),
  },
}));

jest.mock('../../security/scanner', () => ({
  scanImage: jest.fn(async () => ({
    vulnerabilities: [],
    severity: { critical: 0, high: 0, medium: 0, low: 0 },
  })),
}));

jest.mock('../../security/policies', () => ({
  checkCompliance: jest.fn(() => ({ compliant: true })),
}));

jest.mock('../../services/incidents', () => ({
  logActivity: jest.fn(),
}));

jest.mock('../../lib/fingerprinting', () => ({
  generateFingerprint: jest.fn(() => 'test-fingerprint-123'),
}));

jest.mock('../../db/incident-memory', () => ({
  storeIncident: jest.fn(),
  findSimilar: jest.fn(() => []),
}));

jest.mock('../../docker/monitor', () => ({
  getMetrics: jest.fn(() => ({ raw: { cpuPercent: 50, memPercent: 60 } })),
}));

const healer = require('../../docker/healer');

describe('Unit: Docker Healer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('restartContainer', () => {
    it('should successfully restart a container', async () => {
      const result = await healer.restartContainer('test-container-123');

      expect(result.success).toBe(true);
      expect(result.action).toBe('restart');
      expect(result.containerId).toBe('test-container-123');
    });

    it('should handle restart failures gracefully', async () => {
      const { hostManager } = require('../../docker/client');
      hostManager.get.mockReturnValueOnce({ client: null });

      const result = await healer.restartContainer('invalid-container');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should block restart if security check fails', async () => {
      const { checkCompliance } = require('../../security/policies');
      checkCompliance.mockReturnValueOnce({ compliant: false, reason: 'Critical vulnerabilities' });

      const result = await healer.restartContainer('vulnerable-container');

      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.error).toContain('Policy Violation');
    });

    it('should store incident after successful restart', async () => {
      const { storeIncident } = require('../../db/incident-memory');

      await healer.restartContainer('test-container-123');

      expect(storeIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          actionTaken: 'restart',
          outcome: 'resolved',
        })
      );
    });
  });

  describe('scaleService', () => {
    it('should successfully scale a service', async () => {
      const { hostManager } = require('../../docker/client');
      const mockService = {
        inspect: jest.fn(async () => ({
          Version: { Index: 1 },
          Spec: { Mode: { Replicated: { Replicas: 2 } } },
        })),
        update: jest.fn(async () => {}),
      };

      hostManager.get.mockReturnValueOnce({
        client: { getService: jest.fn(() => mockService) },
      });

      const result = await healer.scaleService('web-service', 5);

      expect(result.success).toBe(true);
      expect(result.action).toBe('scale');
      expect(result.replicas).toBe(5);
      expect(mockService.update).toHaveBeenCalled();
    });

    it('should handle scaling errors', async () => {
      const { hostManager } = require('../../docker/client');
      hostManager.get.mockReturnValueOnce(null);

      const result = await healer.scaleService('invalid-service', 3);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
