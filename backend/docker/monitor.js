const { docker } = require('./client');

class ContainerMonitor {
    constructor() {
        this.metrics = new Map();
        this.watchers = new Map();
    }

    async startMonitoring(containerId) {
        if (this.watchers.has(containerId)) return;

        try {
            const container = docker.getContainer(containerId);
            const stream = await container.stats({ stream: true });

            stream.on('data', (chunk) => {
                try {
                    const stats = JSON.parse(chunk.toString());
                    this.metrics.set(containerId, this.parseStats(stats));
                } catch (e) {
                    // Ignore parse errors from partial chunks
                }
            });

            stream.on('error', (err) => {
                console.error(`Stream error for ${containerId}:`, err);
                this.stopMonitoring(containerId);
            });

            this.watchers.set(containerId, stream);
        } catch (error) {
            console.error(`Failed to start monitoring ${containerId}:`, error);
        }
    }

    stopMonitoring(containerId) {
        if (this.watchers.has(containerId)) {
            const stream = this.watchers.get(containerId);
            if (stream.destroy) stream.destroy();
            this.watchers.delete(containerId);
            this.metrics.delete(containerId);
        }
    }

    parseStats(stats) {
        // Calculate CPU percentage
        let cpuPercent = 0.0;
        const cpuDelta = stats.cpu_stats.cpu_usage.total_usage -
            stats.precpu_stats.cpu_usage.total_usage;
        const systemDelta = stats.cpu_stats.system_cpu_usage -
            stats.precpu_stats.system_cpu_usage;

        if (systemDelta > 0 && stats.cpu_stats.online_cpus > 0) {
            cpuPercent = (cpuDelta / systemDelta) * stats.cpu_stats.online_cpus * 100;
        }

        // Calculate memory percentage
        const memUsage = stats.memory_stats.usage;
        const memLimit = stats.memory_stats.limit;
        const memPercent = (memUsage / memLimit) * 100;

        return {
            cpu: cpuPercent.toFixed(2),
            memory: {
                usage: this.formatBytes(memUsage),
                limit: this.formatBytes(memLimit),
                percent: memPercent.toFixed(2)
            },
            network: {
                rx: this.formatBytes(stats.networks?.eth0?.rx_bytes || 0),
                tx: this.formatBytes(stats.networks?.eth0?.tx_bytes || 0)
            },
            timestamp: new Date()
        };
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getMetrics(containerId) {
        return this.metrics.get(containerId);
    }
}

module.exports = new ContainerMonitor();
