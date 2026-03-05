const { docker } = require('./client');
const { scanImage } = require('../security/scanner');
const EventEmitter = require('events');
const metricsStore = require('../db/metrics-store');
const { predictContainer } = require('./predictor');

class ContainerMonitor extends EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.pollingInterval = 30000; // 30 seconds default
        this.isRunning = false;
        this.isPolling = false;
        this.timer = null;

        // Upstream feature tracking
        this.lastStorePush = new Map();
        this.securityTimers = new Map();
        this.restartCounts = new Map();
        this.containerNames = new Map();
        this.lastInspectTimes = new Map();
        this.lastPredictTimes = new Map();
    }

    async init() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('🚀 Initializing Docker Event-Driven Monitor with Analytics...');

        // 1. Listen for Docker events (lifecycle management)
        try {
            const eventStream = await docker.getEvents({
                filters: { type: ['container'], event: ['start', 'stop', 'die', 'destroy'] }
            });

            let buffer = '';
            eventStream.on('data', (chunk) => {
                buffer += chunk.toString('utf8');
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);
                        const containerId = event.Actor?.ID || event.id;
                        const action = event.Action || event.status || event.action;

                        if (!containerId || !action) continue;

                        if (action === 'start') {
                            console.log(`📡 Container started: ${containerId.substring(0, 12)} - Initializing monitoring...`);
                            this.pollSingle(containerId); // Immediate first look
                        } else if (['stop', 'die', 'destroy'].includes(action)) {
                            console.log(`📡 Container stopped: ${containerId.substring(0, 12)} - Clearing data`);
                            this.cleanup(containerId);
                        }
                    } catch (e) {
                        // ignore malformed event line
                    }
                }
            });

            eventStream.on('error', (err) => {
                console.error('❌ Docker event stream error:', err);
                this.isRunning = false;
                setTimeout(() => this.init(), 5000);
            });
        } catch (error) {
            console.error('❌ Failed to subscribe to Docker events:', error);
            this.isRunning = false;
            setTimeout(() => this.init(), 5000);
        }

        // 2. Start throttled metrics polling
        this.startPolling();
    }

    startPolling() {
        if (this.timer) clearInterval(this.timer);
        this.pollAll();
        this.timer = setInterval(() => this.pollAll(), this.pollingInterval);
    }

    async pollAll() {
        if (this.isPolling) return; // Prevent overlap
        this.isPolling = true;

        try {
            const containers = await docker.listContainers({ all: false });
            const activeIds = new Set(containers.map(c => c.Id));

            // Clean stale containers (missed stop events)
            for (const knownId of this.metrics.keys()) {
                if (!activeIds.has(knownId)) {
                    console.log(`🧹 Cleaning up stale container: ${knownId.substring(0, 12)}`);
                    this.cleanup(knownId);
                }
            }

            // Parallel polling
            await Promise.allSettled(containers.map(c => this.pollSingle(c.Id)));
        } catch (error) {
            console.error('❌ Global poll failed:', error);
        } finally {
            this.isPolling = false;
        }
    }

    async pollSingle(containerId) {
        try {
            const container = docker.getContainer(containerId);
            const now = Date.now();

            // 1. Periodic Inspection (Throttled to 30s as per upstream logic)
            const lastInspect = this.lastInspectTimes.get(containerId) || 0;
            if (now - lastInspect > 30000 || !this.containerNames.has(containerId)) {
                try {
                    const data = await container.inspect();
                    this.lastInspectTimes.set(containerId, now);
                    this.restartCounts.set(containerId, data.RestartCount || 0);
                    this.containerNames.set(containerId, data.Name.replace(/^\//, ''));

                    // Check if security scan needed
                    if (!this.securityTimers.has(containerId)) {
                        this.scheduleSecurityScan(containerId, data.Image);
                    }
                } catch (e) { /* silent fail for transient inspect errors */ }
            }

            // 2. Fetch Stats
            const stats = await container.stats({ stream: false });
            const parsed = this.parseStats(stats);
            this.metrics.set(containerId, parsed);

            // 3. Push to Metrics Store & Predict (matches upstream frequency Logic: 5s)
            // Even if global poll is 30s, we push what we have when we poll.
            metricsStore.push(containerId, {
                cpuPercent: parsed.raw.cpuPercent,
                memPercent: parsed.raw.memPercent,
                restartCount: this.restartCounts.get(containerId) || 0
            });

            const prediction = predictContainer(containerId);
            if (prediction && prediction.probability > 0.3) {
                this.emit('prediction', { ...prediction, containerName: this.containerNames.get(containerId) });
            }

        } catch (error) {
            // Container likely disappeared
            this.cleanup(containerId);
        }
    }

    cleanup(containerId) {
        this.metrics.delete(containerId);
        this.lastStorePush.delete(containerId);
        this.restartCounts.delete(containerId);
        this.containerNames.delete(containerId);
        this.lastInspectTimes.delete(containerId);
        this.lastPredictTimes.delete(containerId);
        metricsStore.clear(containerId);

        if (this.securityTimers.has(containerId)) {
            clearInterval(this.securityTimers.get(containerId));
            this.securityTimers.delete(containerId);
        }
    }

    scheduleSecurityScan(containerId, imageId) {
        scanImage(imageId).catch(err => console.error(`[Security] Automated scan failed for ${containerId}:`, err.message));
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

    getMetrics(containerId) {
        return this.metrics.get(containerId);
    }
}

module.exports = new ContainerMonitor();
