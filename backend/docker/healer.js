const { hostManager } = require('./client');
const { scanImage } = require('../security/scanner');
const { checkCompliance } = require('../security/policies');
const { logActivity } = require('../services/incidents');
const { generateFingerprint } = require('../lib/fingerprinting');
const { storeIncident, findSimilar } = require('../db/incident-memory');
const containerMonitor = require('./monitor');

/**
 * Safely extracts error message from any error type.
 * @param {unknown} err - The error to extract message from
 * @returns {string} The error message
 */
function getErrorMessage(err) {
    return err instanceof Error ? err.message : String(err);
}

async function performSecurityPrecheck(compoundId) {
    try {
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) return { blocked: true, error: `Host disconnected: ${hostId}` };

        const container = hostData.client.getContainer(containerId);
        const info = await container.inspect();
        const imageId = info.Image;
        const scanResult = await scanImage(imageId);
        const policyCheck = checkCompliance(scanResult);

        if (!policyCheck.compliant) {
            const errorMsg = `Policy Violation: ${policyCheck.reason || 'Security check failed'}. Blocked action.`;
            if (logActivity) logActivity('warn', errorMsg);
            return { blocked: true, error: errorMsg };
        }
        return { blocked: false };
    } catch (e) {
        const errorMsg = getErrorMessage(e);
        console.error(`Security precheck failed for ${compoundId}:`, errorMsg);
        // Fail open or closed? Usually fail closed for security.
        return { blocked: true, error: `Security check error: ${errorMsg}` };
    }
}

async function restartContainer(compoundId) {
    const startTime = Date.now();
    let containerName = compoundId;

    try {
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);

        const container = hostData.client.getContainer(containerId);
        const info = await container.inspect();
        containerName = info.Name.replace(/^\//, '');

        // --- Memory / Fingerprinting ---
        // Get current metrics to add to fingerprint
        const metrics = containerMonitor.getMetrics(compoundId)?.raw || {};

        // Check for similar past incidents to log "AI awareness"
        const preFingerprint = generateFingerprint({
            containerName,
            metrics: {
                cpuPercent: metrics.cpuPercent,
                memPercent: metrics.memPercent,
                restartCount: info.RestartCount
            },
            logs: 'crash restart' // simulated log context
        });

        const similarIncidents = findSimilar(preFingerprint);
        if (similarIncidents.length > 0) {
            console.log(`[Operational Memory] Found ${similarIncidents.length} similar incidents for ${containerName}. Top match resolved by: ${similarIncidents[0].resolution}`);
        }
        // -------------------------------

        // --- Security Check ---
        const securityCheck = await performSecurityPrecheck(compoundId);
        if (securityCheck.blocked) {
            const errorMsg = securityCheck.error;
            console.error(errorMsg);
            return { action: 'restart', success: false, containerId: compoundId, error: errorMsg, blocked: true };
        }
        // ----------------------

        await container.restart({ t: 10 });

        // --- Store Incident Outcome ---
        const mttr = Math.floor((Date.now() - startTime) / 1000);
        storeIncident({
            id: `inc-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            containerName,
            fingerprint: preFingerprint,
            summary: `Automated restart for ${containerName}`,
            resolution: `Restarted container`,
            actionTaken: 'restart',
            outcome: 'resolved', // optimistically
            mttrSeconds: mttr
        });
        // ------------------------------

        return { action: 'restart', success: true, containerId: compoundId };
    } catch (error) {
        const errorMsg = getErrorMessage(error);
        console.error(`Failed to restart container ${compoundId}:`, errorMsg);
        return { action: 'restart', success: false, containerId: compoundId, error: errorMsg };
    }
}

async function recreateContainer(compoundId) {
    try {
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);

        const container = hostData.client.getContainer(containerId);

        // --- Security Check ---
        const securityCheck = await performSecurityPrecheck(compoundId);
        if (securityCheck.blocked) {
            const errorMsg = securityCheck.error;
            console.error(errorMsg);
            return { action: 'recreate', success: false, containerId: compoundId, error: errorMsg, blocked: true };
        }
        // ----------------------

        const info = await container.inspect();
        // Prepare new configuration
        // Use proper mapping for NetworkingConfig from validated inspection
        const networkingConfig = {
            EndpointsConfig: info.NetworkSettings.Networks
        };

        const newName = `${info.Name.replace('/', '')}-new`;
        const newContainer = await hostData.client.createContainer({
            Image: info.Config.Image,
            name: newName,
            ...info.Config,
            HostConfig: info.HostConfig,
            NetworkingConfig: networkingConfig
        });

        await newContainer.start();

        if (info.State.Running) {
            await container.stop();
        }
        await container.remove();

        await newContainer.rename({ name: info.Name.replace('/', '') });

        return { action: 'recreate', success: true, newId: `${hostId}:${newContainer.id}` };
    } catch (error) {
        const errorMsg = getErrorMessage(error);
        console.error(`Failed to recreate container ${compoundId}:`, errorMsg);
        return { action: 'recreate', success: false, containerId: compoundId, error: errorMsg };
    }
}

async function scaleService(serviceName, replicas, hostId = 'local') {
    try {
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);

        const service = hostData.client.getService(serviceName);
        const info = await service.inspect();
        const version = info.Version.Index;

        const spec = { ...info.Spec };
        if (!spec.Mode) spec.Mode = {};
        if (!spec.Mode.Replicated) spec.Mode.Replicated = {};
        spec.Mode.Replicated.Replicas = parseInt(replicas, 10);

        await service.update({
            version: version,
            ...spec
        });
        return { action: 'scale', replicas, success: true };
    } catch (error) {
        const errorMsg = getErrorMessage(error);
        console.error(`Failed to scale service ${serviceName}:`, errorMsg);
        return { action: 'scale', replicas, success: false, error: errorMsg };
    }
}

module.exports = { restartContainer, recreateContainer, scaleService };
