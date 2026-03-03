/**
 * Integration Tests: Healing Cycle
 * Tests the complete detection -> healing -> verification flow
 */

const { EventEmitter } = require('events');

// Mock dependencies
jest.mock('../../docker/client', () => ({
  hostManager: {
    parseId: jest.fn((id) => ({ hostId: 'local', containerId: id })),
    get: jest.fn(() => ({
      client: {
        getContainer: jest.fn((id) => ({
          inspect: jest.fn(async () => ({
            Id: id,
            Name: '/test-service',
            Image: 'test-image:latest',
            State: { Running: true, Health: { Status: 'unhealthy' } },
            RestartCount: 2,
          })),
          restart: jest.fn(async () => {}),
        })),
      },
    })),
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

jest.mock('../../services/incidents', () => {
  const incidents = [];
  return {
    logActivity: jest.fn((type, message) => {
      incidents.push({ type, message, timestamp: new Date() });
    }),
    getActivityLog: jest.fn(() => incidents),
  };
});

jest.mock('../../lib/fingerprinting', () => ({
  generateFingerprint: jest.fn(() => 'fingerprint-123'),
}));

jest.mock('../../db/incident-memory', () => ({
  storeIncident: jest.fn(),
  findSimilar: jest.fn(() => []),
}));

jest.mock('../../docker/monitor', () => ({
  getMetrics: jest.fn(() => ({
    raw: { cpuPercent: 85, memPercent: 90 },
  })),
}));

describe('Integration: Healing Cycle', () => {
  let healer;
  let incidents;

  beforeEach(() => {
    jest.clearAllMocks();
    healer = require('../../docker/healer');
    incidents = require('../../services/incidents');
  });

  describe('Complete Healing Flow', () => {
    it('should detect unhealthy container and heal it', async () => {
      // Step 1: Detect unhealthy container
      const containerId = 'unhealthy-container-123';

      // Step 2: Trigger healing
      const healResult = await healer.restartContainer(containerId);

      // Step 3: Verify healing was successful
      expect(healResult.success).toBe(true);
      expect(healResult.action).toBe('restart');

      // Step 4: Verify incident was logged
      const { storeIncident } = require('../../db/incident-memory');
      expect(storeIncident).toHaveBeenCalledWith(
        expect.objectContaining({
          actionTaken: 'restart',
          outcome: 'resolved',
        })
      );
    });

    it('should check for similar past incidents', async () => {
      const { findSimilar } = require('../../db/incident-memory');
      findSimilar.mockReturnValueOnce([
        {
          id: 'past-incident-1',
          resolution: 'Restarted container',
          mttrSeconds: 30,
        },
      ]);

      await healer.restartContainer('container-with-history');

      expect(findSimilar).toHaveBeenCalled();
    });

    it('should block healing if security check fails', async () => {
      const { checkCompliance } = require('../../security/policies');
      checkCompliance.mockReturnValueOnce({
        compliant: false,
        reason: 'Critical CVE detected',
      });

      const result = await healer.restartContainer('vulnerable-container');

      expect(result.success).toBe(false);
      expect(result.blocked).toBe(true);
      expect(result.error).toContain('Policy Violation');
    });

    it('should measure MTTR (Mean Time To Recovery)', async () => {
      const startTime = Date.now();

      await healer.restartContainer('test-container');

      const { storeIncident } = require('../../db/incident-memory');
      const storedIncident = storeIncident.mock.calls[0][0];

      expect(storedIncident.mttrSeconds).toBeDefined();
      expect(storedIncident.mttrSeconds).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Multi-Container Healing', () => {
    it('should heal multiple containers independently', async () => {
      const containers = ['container-1', 'container-2', 'container-3'];

      const results = await Promise.all(
        containers.map((id) => healer.restartContainer(id))
      );

      expect(results).toHaveLength(3);
      results.forEach((result) => {
        expect(result.success).toBe(true);
      });
    });

    it('should continue healing even if one container fails', async () => {
      const { hostManager } = require('../../docker/client');

      // Make second container fail
      let callCount = 0;
      hostManager.get.mockImplementation(() => {
        callCount++;
        if (callCount === 2) return null; // Fail second call
        return {
          client: {
            getContainer: jest.fn(() => ({
              inspect: jest.fn(async () => ({
                Id: 'test',
                Name: '/test',
                Image: 'test:latest',
                State: { Running: true },
              })),
              restart: jest.fn(async () => {}),
            })),
          },
        };
      });

      const results = await Promise.all([
        healer.restartContainer('container-1'),
        healer.restartContainer('container-2'),
        healer.restartContainer('container-3'),
      ]);

      const successful = results.filter((r) => r.success);
      const failed = results.filter((r) => !r.success);

      expect(successful.length).toBe(2);
      expect(failed.length).toBe(1);
    });
  });
});
