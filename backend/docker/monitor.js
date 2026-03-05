const { hostManager } = require('./client');
const store = require('../db/metrics-store');
const { scanImage } = require('../security/scanner');

class ContainerMonitor {
    constructor() {
        this.metrics = new Map();
        this.watchers = new Map();
        this.lastStorePush = new Map();
        this.securityTimers = new Map();
    }

    async startMonitoring(compoundId) {
        if (this.watchers.has(compoundId)) return;

        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);

        if (!hostData || !hostData.client) {
            console.error(`Failed to start monitoring ${compoundId}: Host disconnected`);
            return;
        }

        try {
            const container = hostData.client.getContainer(containerId);
            const data = await container.inspect();
            const imageId = data.Image;

            const stream = await container.stats({ stream: true });

            this.watchers.set(containerId, stream);

            // Schedule periodic scans after successful stream setup
            this.scheduleSecurityScan(containerId, imageId);

            stream.on('data', (chunk) => {
                try {
                    const stats = JSON.parse(chunk.toString());
                    const parsed = this.parseStats(stats);
                    this.metrics.set(containerId, parsed);

                    const now = Date.now();
                    const lastPush = this.lastStorePush.get(containerId) || 0;
                    if (now - lastPush >= 60_000) {
                        store.push(containerId, {
                            cpuPercent: parseFloat(parsed.cpu),
                            memPercent: parseFloat(parsed.memory.percent)
                        });
                        this.lastStorePush.set(containerId, now);
                    }
                } catch (e) {
                    // Ignore parse errors from partial chunks
                }
            });

            stream.on('error', (err) => {
                console.error(`Stream error for ${compoundId}:`, err);
                this.stopMonitoring(compoundId);
            });

            stream.on('end', () => {
                this.stopMonitoring(compoundId);
            });

            // watchers.set was moved up
        } catch (error) {
            console.error(`Failed to start monitoring ${containerId}:`, error);
            this.stopMonitoring(containerId); // Clean up any timers/watchers
        }
    }

    stopMonitoring(containerId) {
        const stream = this.watchers.get(containerId);
        if (stream && stream.destroy) stream.destroy();
        this.watchers.delete(containerId);
        this.metrics.delete(containerId);
        this.lastStorePush.delete(containerId);
        store.clear(containerId);
        if (this.securityTimers.has(containerId)) {
            clearInterval(this.securityTimers.get(containerId));
            this.securityTimers.delete(containerId);
        }
    }

    scheduleSecurityScan(containerId, imageId) {
        // Run scan immediately if not cached recently (scanner internally checks cache)
        scanImage(imageId).catch(err => console.error(`[Security] Automated scan failed for ${containerId}:`, err.message));

        // Schedule periodic scans (e.g., daily)
        const interval = 24 * 60 * 60 * 1000;
        const timer = setInterval(() => {
            scanImage(imageId).catch(err => console.error(`[Security] Periodic scan failed for ${containerId}:`, err.message));
        }, interval);

        this.securityTimers.set(containerId, timer);
    }

    parseStats(stats) {
        let cpuPercent = 0.0;
        const cpuUsage = stats.cpu_stats?.cpu_usage?.total_usage || 0;
        const preCpuUsage = stats.precpu_stats?.cpu_usage?.total_usage || 0;
        const systemCpuUsage = stats.cpu_stats?.system_cpu_usage || 0;
        const preSystemCpuUsage = stats.precpu_stats?.system_cpu_usage || 0;
        const onlineCpus = stats.cpu_stats?.online_cpus || stats.cpu_stats?.cpu_usage?.percpu_usage?.length || 1;

        const cpuDelta = cpuUsage - preCpuUsage;
        const systemDelta = systemCpuUsage - preSystemCpuUsage;

        if (systemDelta > 0 && cpuDelta > 0) {
            cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100;
        }

        const memStats = stats.memory_stats || {};
        const memUsage = memStats.usage || 0;
        const memLimit = memStats.limit || 0;
        let memPercent = 0;

        if (memLimit > 0) {
            memPercent = (memUsage / memLimit) * 100;
        }

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
            timestamp: new Date(),
            raw: {
                cpuPercent,
                memPercent,
                memLimit
            }
        };
    }

    formatBytes(bytes) {
        if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        const safeIndex = Math.min(Math.max(i, 0), sizes.length - 1);
        return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(2)) + ' ' + sizes[safeIndex];
    }

    getMetrics(compoundId) {
        const { containerId } = hostManager.parseId(compoundId);
        return this.metrics.get(containerId);
    }
}

module.exports = new ContainerMonitor();
