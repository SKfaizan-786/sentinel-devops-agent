const store = require('../db/metrics-store');
const PRICING_PRESETS = require('../config/cloud-pricing.json');

function calculateContainerCost(container, presetKey = 'aws') {
    const preset = PRICING_PRESETS[presetKey] || PRICING_PRESETS.aws;
    const { cpuHour, ramGBHour } = preset;

    // Dockerode container list object might have different structure than inspect
    // For cost estimation, we'll try to get limits if they exist
    const allocCPU = (container.HostConfig?.NanoCpus || container.hostConfig?.NanoCpus) / 1e9 || 2; // Default 2 vCPU if not set
    const allocRAMgb = (container.HostConfig?.Memory || container.hostConfig?.Memory || 1024 * 1024 * 1024) / (1024 ** 3); // Default 1GB

    const monthlyEstimate = (allocCPU * cpuHour + allocRAMgb * ramGBHour) * 730;

    // Analysis window: last 12 hours (approx 720 samples if 1/min)
    const window = store.getWindow(container.id || container.Id, 720);
    const avgCPU = window.length ? window.reduce((s, m) => s + m.cpuPercent, 0) / window.length : null;
    const avgMem = window.length ? window.reduce((s, m) => s + m.memPercent, 0) / window.length : null;

    let wasteClass = 'healthy';
    const isStopped = container.State === 'exited' || container.status === 'exited';

    if (isStopped) {
        wasteClass = 'zombie';
    } else if (avgCPU !== null && avgMem !== null) {
        if (avgCPU < 5 && avgMem < 10) wasteClass = 'idle';
        else if (avgCPU < 20 || avgMem < 30) wasteClass = 'over-provisioned';
    }

    const potentialSavings = wasteClass !== 'healthy'
        ? monthlyEstimate * (wasteClass === 'idle' ? 0.9 : wasteClass === 'zombie' ? 1.0 : 0.4)
        : 0;

    return {
        containerId: container.id || container.Id,
        name: container.name || (container.Names?.[0]?.replace('/', '')),
        monthlyEstimate: parseFloat(monthlyEstimate.toFixed(2)),
        avgCPUPercent: avgCPU ? parseFloat(avgCPU.toFixed(1)) : null,
        avgMemPercent: avgMem ? parseFloat(avgMem.toFixed(1)) : null,
        wasteClass,
        potentialSavingsMonthly: parseFloat(potentialSavings.toFixed(2)),
        recommendation: wasteClass === 'zombie'
            ? 'Remove this stopped container'
            : wasteClass === 'idle'
                ? 'Consider stopping or removing this container'
                : wasteClass === 'over-provisioned'
                    ? 'Reduce CPU/memory allocation by 50%'
                    : 'Resource utilization is healthy',
    };
}

module.exports = { calculateContainerCost, PRICING_PRESETS };
