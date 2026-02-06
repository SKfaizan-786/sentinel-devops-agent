/**
 * @typedef {Object} DockerContainer
 * @property {string} id - Container ID
 * @property {string} name - Container Name
 * @property {string} image - Image Name
 * @property {string} status - Container State (running, exited, etc.)
 * @property {string} health - Health status (healthy, unhealthy, starting, unknown)
 * @property {Array<Object>} ports - Port mappings
 * @property {Date} created - Creation timestamp
 */

/**
 * @typedef {Object} ContainerMetrics
 * @property {string} cpu - CPU usage percentage
 * @property {Object} memory - Memory usage stats
 * @property {string} memory.usage - Current memory usage
 * @property {string} memory.limit - Memory limit
 * @property {string} memory.percent - Memory usage percentage
 * @property {Object} network - Network stats
 * @property {string} network.rx - Bytes received
 * @property {string} network.tx - Bytes transmitted
 * @property {Date} timestamp - Time of measurement
 */

/**
 * @typedef {Object} HealthStatus
 * @property {string} status - Health status string
 * @property {number} failingStreak - Number of consecutive failures
 * @property {Array<Object>} log - Recent health check logs
 */

module.exports = {};
