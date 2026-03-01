const { docker } = require('./client');
const store = require('../db/metrics-store');
const { scanImage } = require('../security/scanner');
const EventEmitter = require('events');
const metricsStore = require('../db/metrics-store');
const { predictContainer } = require('./predictor');

class ContainerMonitor extends EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.watchers = new Map();
        this.lastStorePush = new Map();
        this.securityTimers = new Map();
        this.restartCounts = new Map();
        this.containerNames = new Map();
        this.lastInspectTimes = new Map();
    }

    async startMonitoring(containerId) {
        if (this.watchers.has(containerId)) return;

        try {
            const container = docker.getContainer(containerId);
            const data = await container.inspect();
            const imageId = data.Image;
            
            // Track initial restart count
            this.restartCounts.set(containerId, data.RestartCount || 0);
            // Track container name
            this.containerNames.set(containerId, data.Name.replace(/^\//, ''));

            const stream = await container.stats({ stream: true });

            this.watchers.set(containerId, stream);

            // Schedule periodic scans after successful stream setup
            this.scheduleSecurityScan(containerId, imageId);

            stream.on('data', async (chunk) => {
                try {
                    const stats = JSON.parse(chunk.toString());
                    const parsed = this.parseStats(stats);
                    this.metrics.set(containerId, parsed);

                    // Throttle inspect requests to every 30s to update restart counts
                    const now = Date.now();
                    const lastInspect = this.lastInspectTimes.get(containerId) || 0;
                    
                    if (now - lastInspect > 30000) {
                        try {
                            const currentInfo = await container.inspect();
                            this.restartCounts.set(containerId, currentInfo.RestartCount || 0);
                            this.lastInspectTimes.set(containerId, now);
                        } catch (inspectError) {
                            // Suppress transient inspect errors
                        }
                    }

                    if (!this.lastPredictTimes) this.lastPredictTimes = new Map();
                    const lastPredict = this.lastPredictTimes.get(containerId) || 0;

                    if (now - lastPredict > 5000) {
                        metricsStore.push(containerId, { 
                            cpuPercent: parsed.raw.cpuPercent, 
                            memPercent: parsed.raw.memPercent, 
                            restartCount: this.restartCounts.get(containerId) || 0 
                        });

                        const prediction = predictContainer(containerId);
                        if (prediction && prediction.probability > 0.3) {
                            this.emit('prediction', { ...prediction, containerName: this.containerNames.get(containerId) });
                        }
                        this.lastPredictTimes.set(containerId, now);
                    }
                } catch (e) {
                    // Ignore parse errors from partial chunks
                }
            });


            stream.on('error', (err) => {
                console.error(`Stream error for ${containerId}:`, err);
                this.stopMonitoring(containerId);
            });

            stream.on('end', () => {
                this.stopMonitoring(containerId);
            });

            // watchers.set was moved up
        } catch (error) {
            console.error(`Failed to start monitoring ${containerId}:`, error);
            this.stopMonitoring(containerId); // Clean up any timers/watchers
        }
    }

    stopMonitoring(containerId) {
        if (this.watchers.has(containerId)) {
            const stream = this.watchers.get(containerId);
            if (stream && stream.destroy) stream.destroy();
            this.watchers.delete(containerId);
            this.metrics.delete(containerId);
            this.lastStorePush.delete(containerId);
            metricsStore.clear(containerId);
        }
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
        // Calculate CPU percentage safely
        let cpuPercent = 0.0;

        // Defensive read of nested properties
        const cpuUsage = stats.cpu_stats?.cpu_usage?.total_usage || 0;
        const preCpuUsage = stats.precpu_stats?.cpu_usage?.total_usage || 0;
        const systemCpuUsage = stats.cpu_stats?.system_cpu_usage || 0;
        const preSystemCpuUsage = stats.precpu_stats?.system_cpu_usage || 0;
        // Default to 1 online cpu if missing to avoid division issues (stats often omit this on some platforms)
        const onlineCpus = stats.cpu_stats?.online_cpus || stats.cpu_stats?.cpu_usage?.percpu_usage?.length || 1;

        const cpuDelta = cpuUsage - preCpuUsage;
        const systemDelta = systemCpuUsage - preSystemCpuUsage;

        if (systemDelta > 0 && cpuDelta > 0) {
            cpuPercent = (cpuDelta / systemDelta) * onlineCpus * 100;
        }

        // Calculate memory percentage safely
        // memory_stats might be missing or empty on some platforms/versions
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
        // Clamp index to valid range
        const safeIndex = Math.min(Math.max(i, 0), sizes.length - 1);
        return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(2)) + ' ' + sizes[safeIndex];
    }

    getMetrics(containerId) {
        return this.metrics.get(containerId);
    }
}

module.exports = new ContainerMonitor();
