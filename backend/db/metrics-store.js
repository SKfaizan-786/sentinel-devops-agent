class MetricsStore {
    constructor() {
        this.store = new Map(); // containerId -> Array of metrics
        this.maxWindow = 1440; // Max metrics to keep per container (e.g., 24h at 1/min)
    }

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

    getWindow(containerId, count = 720) {
        const window = this.store.get(containerId) || [];
        return window.slice(-count);
    }

    clear(containerId) {
        this.store.delete(containerId);
    }
}

module.exports = new MetricsStore();
