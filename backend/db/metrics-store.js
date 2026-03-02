/**
 * In-memory store for tracking container performance metrics over a sliding window.
 */
class MetricsStore {
    /**
     * Creates a new MetricsStore instance.
     */
    constructor() {
        this.store = new Map(); // containerId -> Array of metrics
        this.maxWindow = 1440; // Max metrics to keep per container (e.g., 24h at 1/min)
    }

    /**
     * Adds a new metric reading for a container to the store.
     * @param {string} containerId - The ID of the container
     * @param {Object} metrics - The performance metrics to store
     */
    push(containerId, metrics) {
        if (!this.store.has(containerId)) {
            this.store.set(containerId, []);
        }
        const window = this.store.get(containerId);
        window.push({
            ...metrics,
            timestamp: metrics.timestamp || new Date()
        });

        if (window.length > this.maxWindow) {
            window.shift();
        }
    }

    /**
     * Retrieves the most recent metrics for a container.
     * @param {string} containerId - The ID of the container
     * @param {number} [count=720] - The maximum number of metrics to retrieve
     * @returns {Array} An array of metrics objects
     */
    getWindow(containerId, count = 720) {
        const window = this.store.get(containerId) || [];
        return window.slice(-count);
    }

    /**
     * Removes all stored metrics for a specific container.
     * @param {string} containerId - The ID of the container
     */
    clear(containerId) {
        this.store.delete(containerId);
    }
}

module.exports = new MetricsStore();
