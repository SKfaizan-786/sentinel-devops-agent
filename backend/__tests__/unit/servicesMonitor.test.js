/**
 * Unit Tests for Services Monitor
 */

// Mock dependencies before requiring the module
jest.mock('../../metrics/prometheus', () => ({
  metrics: {
    responseTime: {
      observe: jest.fn()
    }
  }
}));

jest.mock('../../services/incidents', () => ({
  logActivity: jest.fn()
}));

jest.mock('../../config/servicesLoader', () => ({
  getAllServices: jest.fn(() => [
    {
      name: 'auth',
      url: 'http://localhost:3001/health',
      type: 'api',
      cluster: 'local',
      clusterName: 'Local',
      region: 'us-east',
      port: 3001
    },
    {
      name: 'payment',
      url: 'http://localhost:3002/health',
      type: 'worker',
      cluster: 'local',
      clusterName: 'Local',
      region: 'us-east',
      port: 3002
    }
  ]),
  getServicesByCluster: jest.fn(() => ({})),
  getServicesByRegion: jest.fn(() => ({})),
  loadServicesConfig: jest.fn()
}));

describe('Services Monitor - Unit Tests', () => {
  let serviceMonitor;

  beforeEach(() => {
    jest.clearAllMocks();
    serviceMonitor = require('../../services/monitor');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleRemoteAgentReport', () => {
    it('should handle remote agent report with valid data', () => {
      const report = {
        clusterId: 'prod-eu',
        clusterName: 'Production EU',
        region: 'eu-west',
        services: {
          'api': {
            status: 'healthy',
            code: 200,
            latencyMs: 50,
            lastUpdated: new Date().toISOString()
          },
          'worker': {
            status: 'degraded',
            code: 503,
            latencyMs: 200,
            lastUpdated: new Date().toISOString()
          }
        }
      };

      // Should not throw
      expect(() => serviceMonitor.handleRemoteAgentReport(report)).not.toThrow();

      // Verify status was updated
      const systemStatus = serviceMonitor.getSystemStatus();
      expect(systemStatus.services['prod-eu:api']).toBeDefined();
      expect(systemStatus.services['prod-eu:api'].status).toBe('healthy');
      expect(systemStatus.services['prod-eu:worker']).toBeDefined();
      expect(systemStatus.services['prod-eu:worker'].status).toBe('degraded');
    });

    it('should handle null/undefined status gracefully with type safety', () => {
      const report = {
        clusterId: 'test-cluster',
        clusterName: 'Test',
        region: 'test',
        services: {
          'api': {
            status: null, // Test null status
            code: 0,
            latencyMs: 0,
            lastUpdated: new Date().toISOString()
          }
        }
      };

      // Should not throw TypeError on toUpperCase
      expect(() => serviceMonitor.handleRemoteAgentReport(report)).not.toThrow();

      const systemStatus = serviceMonitor.getSystemStatus();
      // Status should be coerced to string 'unknown'
      expect(systemStatus.services['test-cluster:api'].status).toBe('unknown');
    });

    it('should handle undefined status with type safety', () => {
      const report = {
        clusterId: 'test-cluster',
        clusterName: 'Test',
        region: 'test',
        services: {
          'api': {
            status: undefined, // Test undefined status
            code: 0,
            latencyMs: 0,
            lastUpdated: new Date().toISOString()
          }
        }
      };

      // Should not throw TypeError on toUpperCase
      expect(() => serviceMonitor.handleRemoteAgentReport(report)).not.toThrow();

      const systemStatus = serviceMonitor.getSystemStatus();
      expect(systemStatus.services['test-cluster:api'].status).toBe('unknown');
    });
  });

  describe('getServicesGroupedByCluster', () => {
    it('should include both static and remote services', () => {
      // Add a remote service
      serviceMonitor.handleRemoteAgentReport({
        clusterId: 'remote-1',
        clusterName: 'Remote Cluster',
        region: 'remote-region',
        services: {
          'remote-api': {
            status: 'healthy',
            code: 200,
            latencyMs: 100,
            lastUpdated: new Date().toISOString()
          }
        }
      });

      const grouped = serviceMonitor.getServicesGroupedByCluster();
      
      // Should have both local and remote clusters
      expect(grouped['local']).toBeDefined();
      expect(grouped['remote-1']).toBeDefined();
      
      // Remote cluster should have correct metadata
      expect(grouped['remote-1'].name).toBe('Remote Cluster');
      expect(grouped['remote-1'].region).toBe('remote-region');
      expect(grouped['remote-1'].services.length).toBeGreaterThan(0);
      
      // Remote service should be present
      const remoteService = grouped['remote-1'].services.find(s => s.name === 'remote-1:remote-api');
      expect(remoteService).toBeDefined();
      expect(remoteService.status).toBe('healthy');
    });
  });

  describe('getServicesGroupedByRegion', () => {
    it('should include both static and remote services', () => {
      // Add a remote service in different region
      serviceMonitor.handleRemoteAgentReport({
        clusterId: 'prod-asia',
        clusterName: 'Production Asia',
        region: 'asia-east',
        services: {
          'api': {
            status: 'healthy',
            code: 200,
            latencyMs: 80,
            lastUpdated: new Date().toISOString()
          }
        }
      });

      const grouped = serviceMonitor.getServicesGroupedByRegion();
      
      // Should have both local and remote regions
      expect(grouped['us-east']).toBeDefined();
      expect(grouped['asia-east']).toBeDefined();
      
      // Remote region should have services
      expect(grouped['asia-east'].services.length).toBeGreaterThan(0);
      
      // Remote service should be present
      const remoteService = grouped['asia-east'].services.find(s => s.name === 'prod-asia:api');
      expect(remoteService).toBeDefined();
      expect(remoteService.status).toBe('healthy');
    });
  });
});
