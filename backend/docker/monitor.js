<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
const { hostManager } = require('./client');
=======
const { docker } = require('./client');
<<<<<<< HEAD
>>>>>>> parent of c92d731 (feat: Implement core backend container healing, monitoring, and security scanning capabilities, complemented by new frontend host health and selection UI.)
const store = require('../db/metrics-store');
const { scanImage } = require('../security/scanner');
=======
const { docker } = require('./client');
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
const { hostManager } = require('./client');
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
const { hostManager } = require('./client');
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
const { hostManager } = require('./client');
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
const { hostManager } = require('./client');
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
=======
const { scanImage } = require('../security/scanner');
const EventEmitter = require('events');
const metricsStore = require('../db/metrics-store');
const { predictContainer } = require('./predictor');
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963

class ContainerMonitor extends EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
<<<<<<< HEAD
        this.watchers = new Map();
=======
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
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
    }

    async init() {
        if (this.isRunning) return;
        this.isRunning = true;

        console.log('🚀 Initializing Docker Event-Driven Monitor with Analytics...');

        // 1. Listen for Docker events (lifecycle management)
        try {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
            const container = hostData.client.getContainer(containerId);
=======
            const container = docker.getContainer(containerId);
>>>>>>> parent of c92d731 (feat: Implement core backend container healing, monitoring, and security scanning capabilities, complemented by new frontend host health and selection UI.)
            const data = await container.inspect();
            const imageId = data.Image;

=======
            const container = docker.getContainer(containerId);
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
            const container = hostData.client.getContainer(containerId);
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
            const container = hostData.client.getContainer(containerId);
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
            const container = hostData.client.getContainer(containerId);
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
            const container = hostData.client.getContainer(containerId);
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
            const stream = await container.stats({ stream: true });

            stream.on('data', (chunk) => {
                try {
                    const stats = JSON.parse(chunk.toString());
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
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
=======
                    this.metrics.set(containerId, this.parseStats(stats));
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
                    this.metrics.set(compoundId, this.parseStats(stats));
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
                    this.metrics.set(compoundId, this.parseStats(stats));
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
                    this.metrics.set(compoundId, this.parseStats(stats));
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
                    this.metrics.set(compoundId, this.parseStats(stats));
>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
                } catch (e) {
                    // Ignore parse errors from partial chunks
=======
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
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
                }
            });

            eventStream.on('error', (err) => {
                console.error('❌ Docker event stream error:', err);
                this.isRunning = false;
                setTimeout(() => this.init(), 5000);
            });
<<<<<<< HEAD

            stream.on('end', () => {
                this.stopMonitoring(containerId);
            });

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
            // watchers.set was moved up
        } catch (error) {
            console.error(`Failed to start monitoring ${containerId}:`, error);
            this.stopMonitoring(containerId); // Clean up any timers/watchers
=======
            this.watchers.set(containerId, stream);
        } catch (error) {
            console.error(`Failed to start monitoring ${containerId}:`, error);
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
        }
    }

    stopMonitoring(containerId) {
<<<<<<< HEAD
        const stream = this.watchers.get(containerId);
        if (stream && stream.destroy) stream.destroy();
        this.watchers.delete(containerId);
=======
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
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
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
=======
        if (this.watchers.has(containerId)) {
            const stream = this.watchers.get(containerId);
            if (stream.destroy) stream.destroy();
            this.watchers.delete(containerId);
            this.metrics.delete(containerId);
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
            this.watchers.set(compoundId, stream);
        } catch (error) {
            console.error(`Failed to start monitoring ${compoundId}:`, error);
        }
    }

<<<<<<< HEAD
    stopMonitoring(compoundId) {
        if (this.watchers.has(compoundId)) {
            const stream = this.watchers.get(compoundId);
            if (stream.destroy) stream.destroy();
            this.watchers.delete(compoundId);
            this.metrics.delete(compoundId);
>>>>>>> parent of 608787c (merge this branch)
        }
=======
    scheduleSecurityScan(containerId, imageId) {
        scanImage(imageId).catch(err => console.error(`[Security] Automated scan failed for ${containerId}:`, err.message));
        const interval = 24 * 60 * 60 * 1000;
        const timer = setInterval(() => {
            scanImage(imageId).catch(err => console.error(`[Security] Periodic scan failed for ${containerId}:`, err.message));
        }, interval);
        this.securityTimers.set(containerId, timer);
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
    }

<<<<<<< HEAD
=======
            this.watchers.set(compoundId, stream);
        } catch (error) {
            console.error(`Failed to start monitoring ${compoundId}:`, error);
        }
    }

    stopMonitoring(compoundId) {
        if (this.watchers.has(compoundId)) {
            const stream = this.watchers.get(compoundId);
            if (stream.destroy) stream.destroy();
            this.watchers.delete(compoundId);
            this.metrics.delete(compoundId);
        }
    }

>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
            this.watchers.set(compoundId, stream);
        } catch (error) {
            console.error(`Failed to start monitoring ${compoundId}:`, error);
        }
    }

    stopMonitoring(compoundId) {
        if (this.watchers.has(compoundId)) {
            const stream = this.watchers.get(compoundId);
            if (stream.destroy) stream.destroy();
            this.watchers.delete(compoundId);
            this.metrics.delete(compoundId);
        }
    }

>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
            this.watchers.set(compoundId, stream);
        } catch (error) {
            console.error(`Failed to start monitoring ${compoundId}:`, error);
        }
    }

    stopMonitoring(compoundId) {
        if (this.watchers.has(compoundId)) {
            const stream = this.watchers.get(compoundId);
            if (stream.destroy) stream.destroy();
            this.watchers.delete(compoundId);
            this.metrics.delete(compoundId);
        }
    }

>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
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
            timestamp: new Date()
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
