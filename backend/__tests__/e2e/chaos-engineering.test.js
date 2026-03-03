/**
 * E2E Tests: Chaos Engineering Scenarios
 * Tests complete self-healing loop with simulated failures
 * 
 * Prerequisites:
 * - Backend server running on PORT 4000
 * - Docker daemon accessible
 * - Test containers deployed
 */

const axios = require('axios');
const { spawn } = require('child_process');

const BACKEND_URL = process.env.TEST_BACKEND_URL || 'http://localhost:4000';
const CHAOS_TIMEOUT = 90000; // 90 seconds for full healing cycle
const POLL_INTERVAL = 2000; // Check every 2 seconds

describe('E2E: Chaos Engineering', () => {
  // Helper: Wait for condition with timeout
  async function waitForCondition(checkFn, timeout = CHAOS_TIMEOUT) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      const result = await checkFn();
      if (result) return true;
      await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL));
    }
    return false;
  }

  // Helper: Check if backend is reachable
  async function isBackendHealthy() {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/status`, {
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Helper: Get service status
  async function getServiceStatus(serviceName) {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/status`);
      return response.data.services[serviceName];
    } catch (error) {
      console.error(`Failed to get status for ${serviceName}:`, error.message);
      return null;
    }
  }

  // Helper: Trigger service failure
  async function triggerServiceFailure(serviceName, failureType = 'crash') {
    try {
      await axios.post(
        `${BACKEND_URL}/api/action/${serviceName}/${failureType}`,
        {},
        { timeout: 5000 }
      );
      return true;
    } catch (error) {
      console.error(`Failed to trigger ${failureType} on ${serviceName}:`, error.message);
      return false;
    }
  }

  // Helper: Execute CLI command
  function executeCLI(args) {
    return new Promise((resolve, reject) => {
      const cli = spawn('node', ['../../cli/index.js', ...args], {
        cwd: __dirname,
        env: { ...process.env, SENTINEL_API_URL: BACKEND_URL },
      });

      let stdout = '';
      let stderr = '';

      cli.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      cli.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      cli.on('close', (code) => {
        resolve({ code, stdout, stderr });
      });

      cli.on('error', reject);
    });
  }

  beforeAll(async () => {
    // Verify backend is running
    const healthy = await isBackendHealthy();
    if (!healthy) {
      console.warn('⚠️  Backend not running. E2E tests require running backend.');
      console.warn('   Start backend: cd backend && npm start');
    }
  });

  describe('Scenario 1: Service Crash and Auto-Recovery', () => {
    it(
      'should detect crashed service and auto-heal within timeout',
      async () => {
        const serviceName = 'auth';

        // Step 1: Verify service is initially healthy
        const initialStatus = await getServiceStatus(serviceName);
        if (!initialStatus) {
          console.warn('⚠️  Skipping test: Backend not accessible');
          return;
        }

        // Step 2: Trigger service crash
        console.log(`🔥 Triggering crash on ${serviceName}...`);
        await triggerServiceFailure(serviceName, 'crash');

        // Step 3: Wait for service to be detected as unhealthy
        const becameUnhealthy = await waitForCondition(async () => {
          const status = await getServiceStatus(serviceName);
          return status && status.status !== 'healthy';
        }, 15000);

        expect(becameUnhealthy).toBe(true);

        // Step 4: Wait for auto-healing to complete
        console.log(`⏳ Waiting for auto-healing (max ${CHAOS_TIMEOUT / 1000}s)...`);
        const recovered = await waitForCondition(async () => {
          const status = await getServiceStatus(serviceName);
          return status && status.status === 'healthy';
        });

        expect(recovered).toBe(true);
        console.log(`✅ Service ${serviceName} recovered successfully`);
      },
      CHAOS_TIMEOUT + 10000
    );
  });

  describe('Scenario 2: Degraded Performance Detection', () => {
    it(
      'should detect and report degraded service',
      async () => {
        const serviceName = 'payment';

        // Trigger degraded state
        console.log(`🐌 Triggering degraded state on ${serviceName}...`);
        await triggerServiceFailure(serviceName, 'degraded');

        // Wait for detection
        const detected = await waitForCondition(async () => {
          const status = await getServiceStatus(serviceName);
          return status && status.status === 'degraded';
        }, 15000);

        expect(detected).toBe(true);
        console.log(`✅ Degraded state detected for ${serviceName}`);
      },
      30000
    );
  });

  describe('Scenario 3: Multiple Concurrent Failures', () => {
    it(
      'should handle multiple service failures simultaneously',
      async () => {
        const services = ['auth', 'payment', 'notification'];

        // Trigger all failures at once
        console.log('🔥 Triggering multiple concurrent failures...');
        await Promise.all(
          services.map((service) => triggerServiceFailure(service, 'crash'))
        );

        // Wait for all to be detected as unhealthy
        const allUnhealthy = await waitForCondition(async () => {
          const statuses = await Promise.all(
            services.map((s) => getServiceStatus(s))
          );
          return statuses.every((status) => status && status.status !== 'healthy');
        }, 20000);

        expect(allUnhealthy).toBe(true);

        // Wait for all to recover
        console.log('⏳ Waiting for all services to recover...');
        const allRecovered = await waitForCondition(async () => {
          const statuses = await Promise.all(
            services.map((s) => getServiceStatus(s))
          );
          return statuses.every((status) => status && status.status === 'healthy');
        });

        expect(allRecovered).toBe(true);
        console.log('✅ All services recovered successfully');
      },
      CHAOS_TIMEOUT + 20000
    );
  });

  describe('Scenario 4: CLI-Triggered Simulation', () => {
    it(
      'should simulate failure via CLI and observe recovery',
      async () => {
        // Use CLI to simulate failure
        console.log('🔥 Simulating failure via CLI...');
        const result = await executeCLI(['simulate', 'auth', 'down']);

        if (result.code !== 0) {
          console.warn('⚠️  CLI not available, skipping test');
          return;
        }

        // Wait for recovery
        const recovered = await waitForCondition(async () => {
          const status = await getServiceStatus('auth');
          return status && status.status === 'healthy';
        });

        expect(recovered).toBe(true);
        console.log('✅ CLI-triggered simulation recovered');
      },
      CHAOS_TIMEOUT + 10000
    );
  });

  describe('Scenario 5: Activity Log Verification', () => {
    it('should log healing activities', async () => {
      // Trigger a failure
      await triggerServiceFailure('auth', 'crash');

      // Wait a bit for logging
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Check activity log
      try {
        const response = await axios.get(`${BACKEND_URL}/api/activity`);
        const activities = response.data.activity;

        expect(Array.isArray(activities)).toBe(true);
        expect(activities.length).toBeGreaterThan(0);

        // Look for relevant log entries
        const hasFailureLog = activities.some((log) =>
          log.message.toLowerCase().includes('critical') ||
          log.message.toLowerCase().includes('down')
        );

        expect(hasFailureLog).toBe(true);
        console.log('✅ Activity logging verified');
      } catch (error) {
        console.warn('⚠️  Could not verify activity log:', error.message);
        throw error;
      }
    });
  });

  describe('Scenario 6: Stress Test - Rapid Failures', () => {
    it(
      'should handle rapid successive failures',
      async () => {
        const serviceName = 'notification';

        // Trigger 3 rapid failures
        console.log('🔥 Triggering rapid successive failures...');
        for (let i = 0; i < 3; i++) {
          await triggerServiceFailure(serviceName, 'crash');
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }

        // System should still recover
        const recovered = await waitForCondition(async () => {
          const status = await getServiceStatus(serviceName);
          return status && status.status === 'healthy';
        });

        expect(recovered).toBe(true);
        console.log('✅ System recovered from rapid failures');
      },
      CHAOS_TIMEOUT + 20000
    );
  });
});
