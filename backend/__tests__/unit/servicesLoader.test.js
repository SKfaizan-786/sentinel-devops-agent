/**
 * Unit Tests for Services Configuration Loader
 */

const path = require('path');
const fs = require('fs');

// Store original environment
const originalEnv = process.env;

describe('Services Configuration Loader - Unit Tests', () => {
  let servicesLoader;
  
  beforeEach(() => {
    // Reset environment
    jest.resetModules();
    process.env = { ...originalEnv };
    // Clear any cached config
    servicesLoader = require('../../config/servicesLoader');
    servicesLoader.clearCache();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('loadServicesConfig', () => {
    it('should load configuration from services.config.json file', () => {
      const config = servicesLoader.loadServicesConfig({ silent: true });
      expect(config).toBeDefined();
      expect(config.clusters).toBeDefined();
      expect(Array.isArray(config.clusters)).toBe(true);
      expect(config.clusters.length).toBeGreaterThan(0);
    });

    it('should return default configuration when no config exists', () => {
      // Clear the cache and use default
      servicesLoader.clearCache();
      const defaultConfig = servicesLoader.DEFAULT_CONFIG;
      expect(defaultConfig.clusters).toBeDefined();
      expect(defaultConfig.clusters[0].id).toBe('local');
    });

    it('should prioritize SERVICES_CONFIG environment variable over file', () => {
      const customConfig = {
        clusters: [{
          id: 'test-cluster',
          name: 'Test Cluster',
          region: 'test-region',
          services: [{
            name: 'test-service',
            url: 'http://test:8080/health',
            type: 'api'
          }]
        }]
      };
      
      process.env.SERVICES_CONFIG = JSON.stringify(customConfig);
      
      // Re-require to get fresh module with new env
      jest.resetModules();
      const loader = require('../../config/servicesLoader');
      loader.clearCache();
      
      const config = loader.loadServicesConfig({ silent: true });
      expect(config.clusters[0].id).toBe('test-cluster');
    });

    it('should fallback to file when SERVICES_CONFIG is invalid JSON', () => {
      process.env.SERVICES_CONFIG = 'invalid-json{';
      
      jest.resetModules();
      const loader = require('../../config/servicesLoader');
      loader.clearCache();
      
      const config = loader.loadServicesConfig({ silent: true });
      expect(config.clusters).toBeDefined();
      // Should fall back to file or default
      expect(config.clusters.length).toBeGreaterThan(0);
    });
  });

  describe('getAllServices', () => {
    it('should return flat array of all services with cluster metadata', () => {
      const services = servicesLoader.getAllServices();
      expect(Array.isArray(services)).toBe(true);
      
      // Each service should have cluster metadata
      for (const service of services) {
        expect(service.name).toBeDefined();
        expect(service.url).toBeDefined();
        expect(service.cluster).toBeDefined();
        expect(service.clusterName).toBeDefined();
        expect(service.region).toBeDefined();
      }
    });
  });

  describe('getServicesByCluster', () => {
    it('should return services grouped by cluster', () => {
      const grouped = servicesLoader.getServicesByCluster();
      expect(typeof grouped).toBe('object');
      
      // Should have at least one cluster
      const clusterIds = Object.keys(grouped);
      expect(clusterIds.length).toBeGreaterThan(0);
      
      // Each cluster should have services
      for (const clusterId of clusterIds) {
        const cluster = grouped[clusterId];
        expect(cluster.id).toBe(clusterId);
        expect(cluster.name).toBeDefined();
        expect(Array.isArray(cluster.services)).toBe(true);
      }
    });
  });

  describe('getServicesByRegion', () => {
    it('should return services grouped by region', () => {
      const grouped = servicesLoader.getServicesByRegion();
      expect(typeof grouped).toBe('object');
      
      // Should have at least one region
      const regions = Object.keys(grouped);
      expect(regions.length).toBeGreaterThan(0);
      
      // Each region should have services
      for (const region of regions) {
        const regionData = grouped[region];
        expect(regionData.region).toBe(region);
        expect(Array.isArray(regionData.services)).toBe(true);
      }
    });
  });

  describe('getServicePortMap', () => {
    it('should return service name to port mapping with namespaced keys', () => {
      const portMap = servicesLoader.getServicePortMap();
      expect(typeof portMap).toBe('object');
      
      // Should have ports for configured services using namespaced keys
      const services = servicesLoader.getAllServices();
      for (const service of services) {
        if (service.port) {
          // Check namespaced key format: cluster:name
          const key = service.cluster ? `${service.cluster}:${service.name}` : service.name;
          expect(portMap[key]).toBe(service.port);
        }
      }
    });
  });

  describe('getRemoteAgentConfig', () => {
    it('should return remote agent configuration', () => {
      const config = servicesLoader.getRemoteAgentConfig();
      expect(typeof config).toBe('object');
      expect(typeof config.enabled).toBe('boolean');
      expect(Array.isArray(config.endpoints)).toBe(true);
    });
  });

  describe('Schema Validation', () => {
    it('should validate correct service configuration', () => {
      const validConfig = {
        clusters: [{
          id: 'valid-cluster',
          name: 'Valid Cluster',
          region: 'us-east',
          services: [{
            name: 'api',
            url: 'http://localhost:3000/health',
            type: 'api',
            port: 3000
          }]
        }]
      };
      
      const result = servicesLoader.ServicesConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should reject configuration with invalid URL', () => {
      const invalidConfig = {
        clusters: [{
          id: 'invalid',
          name: 'Invalid',
          services: [{
            name: 'api',
            url: 'not-a-valid-url'
          }]
        }]
      };
      
      const result = servicesLoader.ServicesConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject configuration without clusters', () => {
      const invalidConfig = {
        clusters: []
      };
      
      const result = servicesLoader.ServicesConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject cluster without services', () => {
      const invalidConfig = {
        clusters: [{
          id: 'empty',
          name: 'Empty Cluster',
          services: []
        }]
      };
      
      const result = servicesLoader.ServicesConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
    });

    it('should reject remoteAgents with enabled=true but empty webhookSecret', () => {
      const invalidConfig = {
        clusters: [{
          id: 'test',
          name: 'Test',
          services: [{
            name: 'api',
            url: 'http://localhost:3000/health'
          }]
        }],
        remoteAgents: {
          enabled: true,
          webhookSecret: '',
          endpoints: []
        }
      };
      
      const result = servicesLoader.ServicesConfigSchema.safeParse(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error?.issues[0]?.message).toContain('webhookSecret required');
    });

    it('should accept remoteAgents with enabled=true and valid webhookSecret', () => {
      const validConfig = {
        clusters: [{
          id: 'test',
          name: 'Test',
          services: [{
            name: 'api',
            url: 'http://localhost:3000/health'
          }]
        }],
        remoteAgents: {
          enabled: true,
          webhookSecret: 'my-secure-secret',
          endpoints: []
        }
      };
      
      const result = servicesLoader.ServicesConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });

    it('should accept remoteAgents with enabled=false and empty webhookSecret', () => {
      const validConfig = {
        clusters: [{
          id: 'test',
          name: 'Test',
          services: [{
            name: 'api',
            url: 'http://localhost:3000/health'
          }]
        }],
        remoteAgents: {
          enabled: false,
          webhookSecret: '',
          endpoints: []
        }
      };
      
      const result = servicesLoader.ServicesConfigSchema.safeParse(validConfig);
      expect(result.success).toBe(true);
    });
  });
});
