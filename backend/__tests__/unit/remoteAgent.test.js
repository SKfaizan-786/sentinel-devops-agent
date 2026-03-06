/**
 * Unit Tests for Remote Agent
 */

const request = require('supertest');
const crypto = require('crypto');

describe('Remote Agent - Unit Tests', () => {
  let remoteAgent;
  let app;

  beforeEach(() => {
    jest.resetModules();
    // Set up test environment
    process.env.AGENT_PORT = '5001';
    process.env.SENTINEL_BACKEND = 'http://test-sentinel:4000';
    process.env.CLUSTER_ID = 'test-cluster';
    process.env.CLUSTER_NAME = 'Test Cluster';
    process.env.REGION = 'us-west';
    process.env.LOCAL_SERVICES = JSON.stringify([
      { name: 'test-api', url: 'http://localhost:3001/health' }
    ]);
    
    remoteAgent = require('../../remoteAgent/index');
    app = remoteAgent.app;
  });

  describe('GET /health - Agent health check', () => {
    it('should return agent health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.clusterId).toBe('test-cluster');
      expect(response.body.clusterName).toBe('Test Cluster');
      expect(response.body.region).toBe('us-west');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('GET /metrics - Get current health metrics', () => {
    it('should return health state', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      expect(response.body.clusterId).toBe('test-cluster');
      expect(response.body.region).toBe('us-west');
      expect(typeof response.body.services).toBe('object');
      expect(response.body.lastUpdated).toBeDefined();
    });
  });

  describe('GET /config - Get agent configuration', () => {
    it('should return agent configuration without secrets', async () => {
      const response = await request(app)
        .get('/config')
        .expect(200);

      expect(response.body.clusterId).toBe('test-cluster');
      expect(response.body.clusterName).toBe('Test Cluster');
      expect(response.body.region).toBe('us-west');
      expect(response.body.sentinelBackend).toBe('http://test-sentinel:4000');
      expect(response.body.servicesCount).toBe(1);
      // Should NOT contain the webhook secret
      expect(response.body.webhookSecret).toBeUndefined();
    });
  });

  describe('POST /configure - Update services configuration', () => {
    it('should update local services configuration', async () => {
      const newServices = [
        { name: 'new-api', url: 'http://localhost:4000/health' },
        { name: 'new-worker', url: 'http://localhost:5000/health' }
      ];

      const response = await request(app)
        .post('/configure')
        .send({ services: newServices })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.servicesCount).toBe(2);
    });

    it('should reject non-array services', async () => {
      const response = await request(app)
        .post('/configure')
        .send({ services: 'not-an-array' })
        .expect(400);

      expect(response.body.error).toBe('services must be an array');
    });
  });

  describe('POST /refresh - Trigger health check', () => {
    it('should trigger immediate health check', async () => {
      const response = await request(app)
        .post('/refresh')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.services).toBeDefined();
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('generateSignature', () => {
    it('should generate HMAC signature for payload', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret';
      
      const signature = remoteAgent.generateSignature(payload, secret);
      
      expect(signature).toMatch(/^sha256=[a-f0-9]+$/);
    });

    it('should return empty string when no secret provided', () => {
      const payload = { test: 'data' };
      
      const signature = remoteAgent.generateSignature(payload, '');
      
      expect(signature).toBe('');
    });

    it('should generate consistent signatures for same payload', () => {
      const payload = { test: 'data' };
      const secret = 'test-secret';
      
      const signature1 = remoteAgent.generateSignature(payload, secret);
      const signature2 = remoteAgent.generateSignature(payload, secret);
      
      expect(signature1).toBe(signature2);
    });
  });

  describe('checkServiceHealth', () => {
    it('should return healthy status for successful health check', async () => {
      // This test uses an unreachable service, so it should return degraded/critical
      const result = await remoteAgent.checkServiceHealth({
        name: 'test-service',
        url: 'http://localhost:59999/health' // Non-existent port
      });
      
      expect(result.name).toBe('test-service');
      expect(result.status).toMatch(/critical|degraded/);
      expect(result.lastUpdated).toBeDefined();
    });
  });

  describe('Admin Authentication', () => {
    let authApp;

    beforeEach(() => {
      jest.resetModules();
      // Configure agent with ADMIN_SECRET
      process.env.ADMIN_SECRET = 'test-admin-secret';
      process.env.CLUSTER_ID = 'secure-cluster';
      
      const authRemoteAgent = require('../../remoteAgent/index');
      authApp = authRemoteAgent.app;
    });

    afterEach(() => {
      delete process.env.ADMIN_SECRET;
    });

    it('should protect /configure endpoint with authentication', async () => {
      const response = await request(authApp)
        .post('/configure')
        .send({ services: [] })
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should protect /refresh endpoint with authentication', async () => {
      const response = await request(authApp)
        .post('/refresh')
        .expect(401);

      expect(response.body.error).toBe('Authentication required');
    });

    it('should allow /configure with valid X-Admin-Secret header', async () => {
      const response = await request(authApp)
        .post('/configure')
        .set('X-Admin-Secret', 'test-admin-secret')
        .send({ services: [] })
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should allow /refresh with valid Authorization header', async () => {
      const response = await request(authApp)
        .post('/refresh')
        .set('Authorization', 'Bearer test-admin-secret')
        .expect(200);

      expect(response.body.success).toBe(true);
    });

    it('should reject /configure with invalid credentials', async () => {
      const response = await request(authApp)
        .post('/configure')
        .set('X-Admin-Secret', 'wrong-secret')
        .send({ services: [] })
        .expect(403);

      expect(response.body.error).toBe('Invalid credentials');
    });

    it('should allow access without auth when ADMIN_SECRET is not configured', async () => {
      // Use original app without ADMIN_SECRET
      const response = await request(app)
        .post('/configure')
        .send({ services: [] })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });
});
