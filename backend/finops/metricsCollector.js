const monitor = require('../docker/monitor');
const { listContainers } = require('../docker/client');
const pool = require('../db/config');

const COLLECT_INTERVAL_MS = 60 * 1000; // 1 minute
const RETENTION_DAYS = 7;

let collectorInterval = null;

/**
 * Parse a formatted byte string (e.g. "128.5 MB") back to raw bytes.
 */
function parseFormattedBytes(str) {
    if (!str || typeof str !== 'string') return 0;
    const parts = str.trim().split(' ');
    if (parts.length !== 2) return 0;
    const value = parseFloat(parts[0]);
    if (isNaN(value)) return 0;
    const unit = parts[1].toUpperCase();
    const multipliers = { 'B': 1, 'KB': 1024, 'MB': 1024 ** 2, 'GB': 1024 ** 3, 'TB': 1024 ** 4 };
    return Math.round(value * (multipliers[unit] || 0));
}

/**
 * Collect a single round of metrics from all running containers
 * and insert into the finops_metric_snapshots table.
 */
async function collectSnapshot() {
    try {
        const containers = await listContainers();

        for (const container of containers) {
            const metrics = monitor.getMetrics(container.id);
            if (!metrics) continue;

            const cpuPercent = parseFloat(metrics.cpu) || 0;
            const memUsageBytes = parseFormattedBytes(metrics.memory?.usage);
            const memLimitBytes = parseFormattedBytes(metrics.memory?.limit);
            const memPercent = parseFloat(metrics.memory?.percent) || 0;

            await pool.query(
                `INSERT INTO finops_metric_snapshots
                    (container_id, container_name, cpu_percent, memory_usage_bytes, memory_limit_bytes, memory_percent)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [container.id, container.name, cpuPercent, memUsageBytes, memLimitBytes, memPercent]
            );
        }

        // Prune old snapshots
        await pool.query(
            `DELETE FROM finops_metric_snapshots WHERE recorded_at < NOW() - INTERVAL '${RETENTION_DAYS} days'`
        );
    } catch (error) {
        console.error('❌ FinOps metric collection failed:', error.message);
    }
}

/**
 * Start the periodic metrics collector.
 */
function startCollector() {
    console.log('💰 FinOps metrics collector started (interval: 60s)');
    // Collect immediately, then on interval
    collectSnapshot();
    collectorInterval = setInterval(collectSnapshot, COLLECT_INTERVAL_MS);
}

/**
 * Stop the periodic metrics collector.
 */
function stopCollector() {
    if (collectorInterval) {
        clearInterval(collectorInterval);
        collectorInterval = null;
        console.log('💰 FinOps metrics collector stopped');
    }
}

module.exports = { startCollector, stopCollector, collectSnapshot };
