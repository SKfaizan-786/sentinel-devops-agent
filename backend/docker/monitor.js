const { docker, hostManager } = require('./client');
const { scanImage } = require('../security/scanner');
const EventEmitter = require('events');
const metricsStore = require('../db/metrics-store');
const { predictContainer } = require('./predictor');
const { handleAsyncError } = require('../utils/errorHandler');

class ContainerMonitor extends EventEmitter {
    constructor() {
        super();
        this.metrics = new Map();
        this.watchers = new Map();
        this.buffers = new Map();
        
        // Upstream feature maps
        this.healthTimers = new Map();
        this.containerLabels = new Map();
        this.containerInfoCache = new Map();
        this.lastHealthState = new Map();
        this.pollingInterval = 30000;
        this.isRunning = false;
        this.isPolling = false;
        this.timer = null;
        this.lastStorePush = new Map();
        this.securityTimers = new Map();
        this.restartCounts = new Map();
        this.containerNames = new Map();
        this.lastInspectTimes = new Map();
        this.lastPredictTimes = new Map();
        // Track container-to-host mapping for multi-host support
        this.containerHosts = new Map();
    }

    /**
     * Start monitoring a container (supports compound IDs)
     * @param {string} compoundId - Compound ID (hostId:containerId) or raw containerId
     * @param {string} hostId - Optional explicit host ID
     */
    async startMonitoring(compoundId, hostId = null) {
        // Use compound ID as the key for all maps
        if (this.watchers.has(compoundId)) return;

        // Parse compound ID to get host and container
        const parsed = hostManager.parseId(compoundId);
        const targetHostId = hostId || parsed.hostId;
        const containerId = parsed.containerId || compoundId;

        // Get the appropriate Docker client
        const client = hostManager.initialized 
            ? hostManager.getClient(targetHostId) 
            : docker;

        if (!client) {
            console.error(`[Monitor] No client available for host '${targetHostId}'`);
            return;
        }

        try {
            const container = client.getContainer(containerId);
            const data = await container.inspect();
            const imageId = data.Image;
            
            // Track initial restart count
            this.restartCounts.set(compoundId, data.RestartCount || 0);
            // Track container name
            this.containerNames.set(compoundId, data.Name.replace(/^\//, ''));
            // Track which host this container is on
            this.containerHosts.set(compoundId, targetHostId);

            let eventBuffer = '';
            eventStream.on('data', (chunk) => {
                eventBuffer += chunk.toString('utf8');
                const lines = eventBuffer.split('\n');
                eventBuffer = lines.pop() || '';

                for (const line of lines) {
                    if (!line.trim()) continue;
                    try {
                        const event = JSON.parse(line);
                        const containerId = event.Actor?.ID || event.id;
                        const action = event.Action || event.status || event.action;

                        if (!containerId || !action) continue;

                        if (action === 'start') {
                            console.log(`📡 Container started: ${containerId.substring(0, 12)} - Initializing monitoring...`);
                            this.pollSingle(containerId);
                            this.startMonitoring(containerId); // Also start streaming if possible
                        } else if (['stop', 'die', 'destroy'].includes(action)) {
                            console.log(`📡 Container stopped: ${containerId.substring(0, 12)} - Clearing data`);
                            this.stopMonitoring(containerId);
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

        this.startPolling();
    }

    async startMonitoring(containerId) {
        if (this.watchers.has(containerId)) return;

        try {
            const container = docker.getContainer(containerId);
            // Pre-register buffer to avoid race condition
            this.buffers.set(containerId, '');
            
            const stream = await container.stats({ stream: true });
            this.watchers.set(containerId, stream);

            stream.on('data', (chunk) => {
                try {
                    const currentBuffer = this.buffers.get(containerId);
                    if (currentBuffer === undefined) return; // Stream data arrived after stopMonitoring

                    let buffer = currentBuffer + chunk.toString();
                    const lines = buffer.split('\n');
                    this.buffers.set(containerId, lines.pop());

                    for (const line of lines) {
                        if (!line.trim()) continue;
                        try {
                            const stats = JSON.parse(line);
                            this.metrics.set(containerId, this.parseStats(stats));
                        } catch (parseError) {
                            // ignore malformed line
                        }
                    }
                } catch (e) {
                    console.error(`Parsing error for ${containerId}:`, e.message);
                }
            });

            stream.on('error', (err) => {
                console.error(`Stream error for ${containerId}:`, err);
                this.stopMonitoring(containerId);
            });

            stream.on('end', () => {
                this.stopMonitoring(containerId);
            });
        } catch (error) {
            console.error(`Failed to start monitoring ${containerId}:`, error);
        }
    }

    stopMonitoring(containerId) {
        if (this.watchers.has(containerId)) {
            const stream = this.watchers.get(containerId);
            if (stream.destroy) stream.destroy();
            this.watchers.delete(containerId);

            // Flush final buffer if it contains a complete JSON object
            const finalBuffer = this.buffers.get(containerId);
            if (finalBuffer && finalBuffer.trim()) {
                try {
                    const stats = JSON.parse(finalBuffer);
                    this.metrics.set(containerId, this.parseStats(stats));
                } catch (e) {
                    // Not a complete JSON object, ignore
                }
            }
            this.buffers.delete(containerId);
        }
    }

    startPolling() {
        if (this.timer) clearInterval(this.timer);
        this.pollAll();
        this.timer = setInterval(() => this.pollAll(), this.pollingInterval);
    }

    async pollAll() {
        if (this.isPolling) return;
        this.isPolling = true;

        try {
            const containers = await docker.listContainers({ all: false });
            const activeIds = new Set(containers.map(c => c.Id));

            for (const knownId of this.metrics.keys()) {
                if (!activeIds.has(knownId)) {
                    this.cleanup(knownId);
                }
            }

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

            const lastInspect = this.lastInspectTimes.get(containerId) || 0;
            if (now - lastInspect > 30000 || !this.containerNames.has(containerId)) {
                try {
                    const data = await container.inspect();
                    this.lastInspectTimes.set(containerId, now);
                    this.restartCounts.set(containerId, data.RestartCount || 0);
                    this.containerNames.set(containerId, data.Name.replace(/^\//, ''));
                    this.containerLabels.set(containerId, data.Config.Labels || {});
                    this.containerInfoCache.set(containerId, data);
                    
                    dependencyGraph.populateFromContainers([...this.containerInfoCache.values()]);

                    if (!this.securityTimers.has(containerId)) {
                        this.scheduleSecurityScan(containerId, data.Image);
                    }
                } catch (e) { }
            }

            const stats = await container.stats({ stream: false });
            const parsed = this.parseStats(stats);
            this.metrics.set(containerId, parsed);

            metricsStore.push(containerId, {
                cpuPercent: parseFloat(parsed.cpu),
                memPercent: parseFloat(parsed.memory.percent),
                restartCount: this.restartCounts.get(containerId) || 0
            });

            const prediction = predictContainer(containerId);
            if (prediction && prediction.probability > 0.3) {
                this.emit('prediction', { ...prediction, containerName: this.containerNames.get(containerId) });
            }

            await this.checkContainerHealth(containerId);
        } catch (error) {
            this.cleanup(containerId);
        }
    }

    cleanup(containerId) {
        this.stopMonitoring(containerId);
        this.metrics.delete(containerId);
        this.lastStorePush.delete(containerId);
        this.restartCounts.delete(containerId);
        this.containerNames.delete(containerId);
        this.lastInspectTimes.delete(containerId);
        this.lastPredictTimes.delete(containerId);
        this.containerLabels.delete(containerId);
        this.lastHealthState.delete(containerId);
        this.containerInfoCache.delete(containerId);
        
        metricsStore.clear(containerId);
        flapDetector.clear(containerId);
        dependencyGraph.clearContainer(containerId);

        if (this.healthTimers.has(containerId)) {
            clearInterval(this.healthTimers.get(containerId));
            this.healthTimers.delete(containerId);
        }
        if (this.securityTimers.has(containerId)) {
            clearInterval(this.securityTimers.get(containerId));
            this.securityTimers.delete(containerId);
        }
    }

    scheduleSecurityScan(containerId, imageId) {
        scanImage(imageId).catch(() => {});
        const interval = 24 * 60 * 60 * 1000;
        const timer = setInterval(() => {
            scanImage(imageId).catch(() => {});
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

    getMetrics(compoundId) {
        return this.metrics.get(compoundId);
    }

    /**
     * Get all metrics aggregated across hosts
     * @returns {Object} Map of compoundId -> metrics
     */
    getAllMetrics() {
        return Object.fromEntries(this.metrics);
    }

    /**
     * Get metrics for a specific host
     * @param {string} hostId - Host ID
     * @returns {Object} Map of compoundId -> metrics for that host
     */
    getMetricsByHost(hostId) {
        const result = {};
        for (const [compoundId, metrics] of this.metrics) {
            if (this.containerHosts.get(compoundId) === hostId) {
                result[compoundId] = metrics;
            }
        }
        return result;
    }

    /**
     * Get host ID for a container
     * @param {string} compoundId - Container compound ID
     * @returns {string|undefined} Host ID
     */
    getContainerHost(compoundId) {
        return this.containerHosts.get(compoundId);
    }

    async checkContainerHealth(containerId) {
        try {
            const container = docker.getContainer(containerId);
            const info = await container.inspect();
            const isRunning = info.State.Running;
            const healthStatus = info.State.Health ? info.State.Health.Status : (isRunning ? 'healthy' : 'unhealthy');
            const isHealthy = healthStatus === 'healthy' || healthStatus === 'starting';

            const lastState = this.lastHealthState.get(containerId);
            if (lastState !== isHealthy) {
                this.lastHealthState.set(containerId, isHealthy);
                const flapResult = flapDetector.record(containerId, isHealthy);

                if (!isHealthy && !flapResult.suppressAlert) {
                    const labels = this.containerLabels.get(containerId) || {};
                    const alert = { containerId, labels, type: 'container_failure', isHealthy };
                    alertCorrelator.add(alert);
                }
            }
        } catch (error) {
            if (error.statusCode === 404) {
                this.cleanup(containerId);
            }
        }
    }

    getCorrelatedGroups() {
        return alertCorrelator.correlate();
    }
}

module.exports = new ContainerMonitor();
