const express = require('express');
const router = express.Router();
const { hostManager } = require('../docker/client');
const { listSwarmServices } = require('../docker/swarm');
const containerMonitor = require('../docker/monitor');

// GET /api/hosts
router.get('/', async (req, res) => {
    try {
        const allHosts = hostManager.getAll();

        const hostsInfo = await Promise.all(allHosts.map(async host => {
            const info = {
                id: host.id,
                label: host.label,
                type: host.type,
                status: host.status,
                error: host.error,
            };

            if (host.status === 'connected' && host.client) {
                try {
                    // Get general info to extract swarm status and container count
                    const dockerInfo = await host.client.info();
                    info.containers = dockerInfo.Containers;
                    info.containersRunning = dockerInfo.ContainersRunning;
                    info.serverVersion = dockerInfo.ServerVersion;
                    info.operatingSystem = dockerInfo.OperatingSystem;
                    info.memoryLimit = dockerInfo.MemTotal;
                    info.ncpu = dockerInfo.NCPU;

                    info.swarm = dockerInfo.Swarm?.LocalNodeState === 'active';
                    if (info.swarm) {
                        info.swarmServices = await listSwarmServices(host.client);
                    }

                    // Aggregate metrics for host using container metrics
                    // This is a naive aggregation: actual host metrics would require node-exporter or native dockerd metrics
                    let totalCpu = 0;
                    let totalMem = 0;
                    let activeMonitoredContainers = 0;

                    const containers = await host.client.listContainers();
                    for (const c of containers) {
                        const compoundId = `${host.id}:${c.Id}`;
                        const metrics = containerMonitor.getMetrics(compoundId);
                        if (metrics) {
                            activeMonitoredContainers++;
                            totalCpu += parseFloat(metrics.cpu || 0);
                            // Approximate memory percentage addition
                            totalMem += parseFloat(metrics.memory?.percent || 0);
                        }
                    }

                    info.aggregatedMetrics = {
                        cpu: totalCpu.toFixed(2),
                        memoryPercent: activeMonitoredContainers > 0 ? (totalMem / activeMonitoredContainers).toFixed(2) : "0.00"
                    };

                } catch (err) {
                    console.error(`Error gathering info for host ${host.id}:`, err);
                    info.status = 'degraded';
                    info.error = err.message;
                }
            }

            return info;
        }));

        res.json({ hosts: hostsInfo });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
