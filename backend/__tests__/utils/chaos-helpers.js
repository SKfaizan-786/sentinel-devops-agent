/**
 * Chaos Engineering Test Helpers
 * Shared utilities for E2E chaos testing
 */

const axios = require('axios');

/**
 * Wait for a condition to be true with timeout
 * @param {Function} checkFn - Async function that returns boolean
 * @param {number} timeout - Max wait time in ms
 * @param {number} interval - Check interval in ms
 * @returns {Promise<boolean>}
 */
async function waitForCondition(checkFn, timeout = 90000, interval = 2000) {
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeout) {
    try {
      const result = await checkFn();
      if (result) return true;
    } catch (error) {
      // Continue waiting on errors
    }
    
    await sleep(interval);
  }
  
  return false;
}

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if backend is healthy
 * @param {string} baseUrl - Backend base URL
 * @returns {Promise<boolean>}
 */
async function isBackendHealthy(baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/api/status`, {
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}

/**
 * Get service status from backend
 * @param {string} baseUrl - Backend base URL
 * @param {string} serviceName - Service name
 * @returns {Promise<Object|null>}
 */
async function getServiceStatus(baseUrl, serviceName) {
  try {
    const response = await axios.get(`${baseUrl}/api/status`, {
      timeout: 5000,
    });
    return response.data.services[serviceName] || null;
  } catch (error) {
    console.error(`Failed to get status for ${serviceName}:`, error.message);
    return null;
  }
}

/**
 * Trigger service failure
 * @param {string} baseUrl - Backend base URL
 * @param {string} serviceName - Service name
 * @param {string} failureType - Type of failure (crash, degraded, slow, down)
 * @returns {Promise<boolean>}
 */
async function triggerServiceFailure(baseUrl, serviceName, failureType = 'crash') {
  try {
    await axios.post(
      `${baseUrl}/api/action/${serviceName}/${failureType}`,
      {},
      { timeout: 5000 }
    );
    return true;
  } catch (error) {
    console.error(`Failed to trigger ${failureType} on ${serviceName}:`, error.message);
    return false;
  }
}

/**
 * Get activity log from backend
 * @param {string} baseUrl - Backend base URL
 * @returns {Promise<Array>}
 */
async function getActivityLog(baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/api/activity`, {
      timeout: 5000,
    });
    return response.data.activity || [];
  } catch (error) {
    console.error('Failed to get activity log:', error.message);
    return [];
  }
}

/**
 * Get Docker containers from backend
 * @param {string} baseUrl - Backend base URL
 * @returns {Promise<Array>}
 */
async function getDockerContainers(baseUrl) {
  try {
    const response = await axios.get(`${baseUrl}/api/docker/containers`, {
      timeout: 5000,
    });
    return response.data.containers || [];
  } catch (error) {
    console.error('Failed to get Docker containers:', error.message);
    return [];
  }
}

/**
 * Restart Docker container
 * @param {string} baseUrl - Backend base URL
 * @param {string} containerId - Container ID
 * @returns {Promise<Object>}
 */
async function restartContainer(baseUrl, containerId) {
  try {
    const response = await axios.post(
      `${baseUrl}/api/docker/restart/${containerId}`,
      {},
      { timeout: 10000 }
    );
    return response.data;
  } catch (error) {
    console.error(`Failed to restart container ${containerId}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Wait for service to reach specific status
 * @param {string} baseUrl - Backend base URL
 * @param {string} serviceName - Service name
 * @param {string} expectedStatus - Expected status (healthy, degraded, critical)
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<boolean>}
 */
async function waitForServiceStatus(baseUrl, serviceName, expectedStatus, timeout = 30000) {
  return waitForCondition(async () => {
    const status = await getServiceStatus(baseUrl, serviceName);
    return status && status.status === expectedStatus;
  }, timeout);
}

/**
 * Wait for all services to be healthy
 * @param {string} baseUrl - Backend base URL
 * @param {Array<string>} serviceNames - Array of service names
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<boolean>}
 */
async function waitForAllServicesHealthy(baseUrl, serviceNames, timeout = 90000) {
  return waitForCondition(async () => {
    const statuses = await Promise.all(
      serviceNames.map((name) => getServiceStatus(baseUrl, name))
    );
    return statuses.every((status) => status && status.status === 'healthy');
  }, timeout);
}

/**
 * Measure time to recovery (MTTR)
 * @param {Function} triggerFn - Function that triggers failure
 * @param {Function} checkRecoveryFn - Function that checks if recovered
 * @param {number} timeout - Max wait time in ms
 * @returns {Promise<Object>} { recovered: boolean, mttr: number }
 */
async function measureMTTR(triggerFn, checkRecoveryFn, timeout = 90000) {
  const startTime = Date.now();
  
  // Trigger failure
  await triggerFn();
  
  // Wait for recovery
  const recovered = await waitForCondition(checkRecoveryFn, timeout);
  
  const mttr = Date.now() - startTime;
  
  return { recovered, mttr };
}

/**
 * Verify activity log contains expected entries
 * @param {string} baseUrl - Backend base URL
 * @param {Array<string>} expectedKeywords - Keywords to look for
 * @returns {Promise<boolean>}
 */
async function verifyActivityLog(baseUrl, expectedKeywords) {
  const activities = await getActivityLog(baseUrl);
  
  return expectedKeywords.every((keyword) =>
    activities.some((log) =>
      log.message.toLowerCase().includes(keyword.toLowerCase())
    )
  );
}

/**
 * Create a chaos scenario runner
 * @param {string} name - Scenario name
 * @param {Function} scenarioFn - Async function that runs the scenario
 * @returns {Function} Test function
 */
function createChaosScenario(name, scenarioFn) {
  return async () => {
    console.log(`\n🔥 Starting chaos scenario: ${name}`);
    const startTime = Date.now();
    
    try {
      await scenarioFn();
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ Scenario completed in ${duration}s: ${name}`);
    } catch (error) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.error(`❌ Scenario failed after ${duration}s: ${name}`);
      throw error;
    }
  };
}

module.exports = {
  waitForCondition,
  sleep,
  isBackendHealthy,
  getServiceStatus,
  triggerServiceFailure,
  getActivityLog,
  getDockerContainers,
  restartContainer,
  waitForServiceStatus,
  waitForAllServicesHealthy,
  measureMTTR,
  verifyActivityLog,
  createChaosScenario,
};
