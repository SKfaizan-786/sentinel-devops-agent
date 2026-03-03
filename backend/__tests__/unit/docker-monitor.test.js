/**
 * Unit Tests: Docker Monitor
 * Tests container monitoring with mocked Docker streams
 */

const { EventEmitter } = require('events');

// Mock dependencies
jest.mock('../../docker/client', () => ({
  hostManager: {
    parseId: jest.fn((id) => ({ hostId: 'local', containerId: id })),
    get: jest.fn(() => ({
      client: {
        getContainer: jest.fn(() => ({
          inspect: jest.fn(async () => ({ Image: 'test-image:latest' })),
          stats: jest.fn(async () => {
            const stream = new EventEmitter();
            setTimeout(() => {
              stream.emit('data', Buffer.from(JSON.stringify({
                cpu_stats: {
                  cpu_usage: { total_usage: 1000000000 },
                  system_cpu_usage: 10000000000,
                  online_cpus: 2,
                },
                precpu_stats: {
                  cpu_usage: { total_usage: 900000000 },
                  system_cpu_usage: 9000000000,
                },
                memory_stats: {
                  usage: 104857600,
                  limit: 1073741824,
                },
                networks: {
                  eth0: { rx_bytes: 1024, tx_bytes: 2048 },
                },
              })));
            }, 10);
            return stream;
          }),
        })),
      },
    })),
  },
}));

jest.mock('../../db/metrics-store', () => ({
  push: jest.fn(),
  clear: jest.fn(),
}));

jest.mock('../../security/scanner', () => ({
  scanImage: jest.fn(async () => ({ vulnerabilities: [] })),
}));

describe('Unit: Docker Monitor', () => {
  let monitor;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    monitor = require('../../docker/monitor');
  });

  afterEach(() => {
    // Clean up any active monitoring
    if (monitor.watchers) {
      monitor.watchers.forEach((_, id) => monitor.stopMonitoring(id));
    }
  });

  describe('startMonitoring', () => {
    it('should start monitoring a container', async () => {
      await monitor.startMonitoring('test-container-123');

      expect(monitor.watchers.has('test-container-123')).toBe(true);
    });

    it('should parse container stats correctly', (done) => {
      monitor.startMonitoring('test-container-123').then(() => {
        setTimeout(() => {
          const metrics = monitor.getMetrics('test-container-123');
          expect(metrics).toBeDefined();
          expect(metrics.cpu).toBeDefined();
          expect(metrics.memory).toBeDefined();
          expect(metrics.network).toBeDefined();
          done();
        }, 50);
      });
    });

    it('should not start duplicate monitoring', async () => {
      await monitor.startMonitoring('test-container-123');
      await monitor.startMonitoring('test-container-123');

      expect(monitor.watchers.size).toBe(1);
    });
  });

  describe('stopMonitoring', () => {
    it('should stop monitoring and clean up resources', async () => {
      await monitor.startMonitoring('test-container-123');
      monitor.stopMonitoring('test-container-123');

      expect(monitor.watchers.has('test-container-123')).toBe(false);
      expect(monitor.getMetrics('test-container-123')).toBeUndefined();
    });
  });

  describe('formatBytes', () => {
    it('should format bytes correctly', () => {
      expect(monitor.formatBytes(0)).toBe('0 B');
      expect(monitor.formatBytes(1024)).toBe('1 KB');
      expect(monitor.formatBytes(1048576)).toBe('1 MB');
      expect(monitor.formatBytes(1073741824)).toBe('1 GB');
    });
  });
});
