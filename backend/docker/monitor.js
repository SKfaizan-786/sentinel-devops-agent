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

            this.watchers.set(compoundId, stream);

            // Schedule periodic scans after successful stream setup
            this.scheduleSecurityScan(compoundId, imageId);

            stream.on('data', (chunk) => {
                try {
                    const stats = JSON.parse(chunk.toString());
                    const parsed = this.parseStats(stats);
                    this.metrics.set(compoundId, parsed);

                    const now = Date.now();
                    const lastPush = this.lastStorePush.get(compoundId) || 0;
                    if (now - lastPush >= 60_000) {
                        store.push(compoundId, {
                            cpuPercent: parseFloat(parsed.cpu),
                            memPercent: parseFloat(parsed.memory.percent)
                        });
                        this.lastStorePush.set(compoundId, now);
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
            console.error(`Failed to start monitoring ${compoundId}:`, error);
            this.stopMonitoring(compoundId); // Clean up any timers/watchers
        }
    }

    stopMonitoring(compoundId) {
        const stream = this.watchers.get(compoundId);
        if (stream && stream.destroy) stream.destroy();
        this.watchers.delete(compoundId);
        this.metrics.delete(compoundId);
        this.lastStorePush.delete(compoundId);
        store.clear(compoundId);
        if (this.securityTimers.has(compoundId)) {
            clearInterval(this.securityTimers.get(compoundId));
            this.securityTimers.delete(compoundId);
        }
    }

    scheduleSecurityScan(compoundId, imageId) {
        // Run scan immediately if not cached recently (scanner internally checks cache)
        scanImage(imageId).catch(err => console.error(`[Security] Automated scan failed for ${compoundId}:`, err.message));

        // Schedule periodic scans (e.g., daily)
        const interval = 24 * 60 * 60 * 1000;
        const timer = setInterval(() => {
            scanImage(imageId).catch(err => console.error(`[Security] Periodic scan failed for ${compoundId}:`, err.message));
        }, interval);

        this.securityTimers.set(compoundId, timer);
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
        return this.metrics.get(compoundId);
    }
}

module.exports = new ContainerMonitor();
