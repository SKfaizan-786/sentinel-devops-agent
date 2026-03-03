<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
const { hostManager } = require('./client');
const store = require('../db/metrics-store');
const { scanImage } = require('../security/scanner');
=======
const { docker } = require('./client');
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
const { hostManager } = require('./client');
>>>>>>> parent of 608787c (merge this branch)
=======
const { hostManager } = require('./client');
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
const { hostManager } = require('./client');
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
const { hostManager } = require('./client');
>>>>>>> parent of 608787c (merge this branch)

class ContainerMonitor {
    constructor() {
        this.metrics = new Map();
        this.watchers = new Map();
    }

    async startMonitoring(containerId) {
        if (this.watchers.has(containerId)) return;

        try {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
            const container = hostData.client.getContainer(containerId);
            const data = await container.inspect();
            const imageId = data.Image;

=======
            const container = docker.getContainer(containerId);
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
            const container = hostData.client.getContainer(containerId);
>>>>>>> parent of 608787c (merge this branch)
=======
            const container = hostData.client.getContainer(containerId);
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
            const container = hostData.client.getContainer(containerId);
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
            const container = hostData.client.getContainer(containerId);
>>>>>>> parent of 608787c (merge this branch)
            const stream = await container.stats({ stream: true });

            stream.on('data', (chunk) => {
                try {
                    const stats = JSON.parse(chunk.toString());
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
                    this.metrics.set(compoundId, this.parseStats(stats));
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
                    this.metrics.set(compoundId, this.parseStats(stats));
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
                    this.metrics.set(compoundId, this.parseStats(stats));
>>>>>>> parent of 608787c (merge this branch)
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

<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
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
        this.metrics.delete(containerId);
        this.lastStorePush.delete(containerId);
        store.clear(containerId);
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

    stopMonitoring(compoundId) {
        if (this.watchers.has(compoundId)) {
            const stream = this.watchers.get(compoundId);
            if (stream.destroy) stream.destroy();
            this.watchers.delete(compoundId);
            this.metrics.delete(compoundId);
>>>>>>> parent of 608787c (merge this branch)
        }
    }

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
            timestamp: new Date()
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
