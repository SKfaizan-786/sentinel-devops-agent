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
>>>>>>> parent of c92d731 (feat: Implement core backend container healing, monitoring, and security scanning capabilities, complemented by new frontend host health and selection UI.)
const { scanImage } = require('../security/scanner');
const { checkCompliance } = require('../security/policies');
const { logActivity } = require('../services/incidents');
const { generateFingerprint } = require('../lib/fingerprinting');
const { storeIncident, findSimilar } = require('../db/incident-memory');
const containerMonitor = require('./monitor');

async function performSecurityPrecheck(containerId) {
    try {
        const container = docker.getContainer(containerId);
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
        console.error(`Security precheck failed for ${containerId}:`, e.message);
        // Fail open or closed? Usually fail closed for security.
        return { blocked: true, error: `Security check error: ${e.message}` };
    }
}

async function restartContainer(containerId) {
    const startTime = Date.now();
    let containerName = containerId;
    
    try {
        const container = docker.getContainer(containerId);
        const info = await container.inspect();
        containerName = info.Name.replace(/^\//, '');

        // --- Memory / Fingerprinting ---
        // Get current metrics to add to fingerprint
        const metrics = containerMonitor.getMetrics(containerId)?.raw || {};
        
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
        const securityCheck = await performSecurityPrecheck(containerId);
        if (securityCheck.blocked) {
             const errorMsg = securityCheck.error;
             console.error(errorMsg);
             return { action: 'restart', success: false, containerId, error: errorMsg, blocked: true };
        }
        // ----------------------
=======
const { hostManager } = require('./client');

async function restartContainer(compoundId) {
    try {
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);
>>>>>>> parent of 608787c (merge this branch)

        const container = hostData.client.getContainer(containerId);
        await container.restart({ t: 10 });
<<<<<<< HEAD
<<<<<<< HEAD

=======
        
>>>>>>> parent of c92d731 (feat: Implement core backend container healing, monitoring, and security scanning capabilities, complemented by new frontend host health and selection UI.)
        // --- Store Incident Outcome ---
        const mttr = Math.floor((Date.now() - startTime) / 1000);
        storeIncident({
            id: `inc-${Date.now()}-${Math.floor(Math.random()*1000)}`,
            containerName,
            fingerprint: preFingerprint,
            summary: `Automated restart for ${containerName}`,
            resolution: `Restarted container`,
            actionTaken: 'restart',
            outcome: 'resolved', // optimistically
            mttrSeconds: mttr
        });
        // ------------------------------

<<<<<<< HEAD
        return { action: 'restart', success: true, containerId: compoundId };
=======
const { docker } = require('./client');

async function restartContainer(containerId) {
    try {
        const container = docker.getContainer(containerId);
        await container.restart({ t: 10 });
        return { action: 'restart', success: true, containerId };
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
        return { action: 'restart', success: true, containerId: compoundId };
>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
const { hostManager } = require('./client');

async function restartContainer(compoundId) {
    try {
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);

        const container = hostData.client.getContainer(containerId);
        await container.restart({ t: 10 });
        return { action: 'restart', success: true, containerId: compoundId };
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
const { hostManager } = require('./client');

async function restartContainer(compoundId) {
    try {
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);

        const container = hostData.client.getContainer(containerId);
        await container.restart({ t: 10 });
        return { action: 'restart', success: true, containerId: compoundId };
>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
const { hostManager } = require('./client');

async function restartContainer(compoundId) {
    try {
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);

        const container = hostData.client.getContainer(containerId);
        await container.restart({ t: 10 });
        return { action: 'restart', success: true, containerId: compoundId };
>>>>>>> parent of 608787c (merge this branch)
=======
        return { action: 'restart', success: true, containerId };
>>>>>>> parent of c92d731 (feat: Implement core backend container healing, monitoring, and security scanning capabilities, complemented by new frontend host health and selection UI.)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
    } catch (error) {
        console.error(`Failed to restart container ${containerId}:`, error);
        return { action: 'restart', success: false, containerId, error: error.message };
    }
}

async function recreateContainer(containerId) {
    try {
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
        const container = docker.getContainer(containerId);
<<<<<<< HEAD
        // Note: inspect is done inside performSecurityPrecheck, but recreate needs info later?
        // Ah, duplicate inspect is better than polluting logic.
        // Or reuse info? For now, keep it simple.
        
        // --- Security Check ---
        const securityCheck = await performSecurityPrecheck(containerId);
        if (securityCheck.blocked) {
             const errorMsg = securityCheck.error;
             console.error(errorMsg);
             return { action: 'recreate', success: false, containerId, error: errorMsg, blocked: true };
        }
        // ----------------------
=======
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);
>>>>>>> parent of 608787c (merge this branch)

        const container = hostData.client.getContainer(containerId);
        const info = await container.inspect();
<<<<<<< HEAD
=======
        const info = await container.inspect();

>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
        // Prepare new configuration
        // Use proper mapping for NetworkingConfig from validated inspection
=======

>>>>>>> parent of 608787c (merge this branch)
<<<<<<< HEAD
=======
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);

        const container = hostData.client.getContainer(containerId);
        const info = await container.inspect();

>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);

        const container = hostData.client.getContainer(containerId);
        const info = await container.inspect();

>>>>>>> parent of 850077c (Merge branch 'main' into deployment)
=======
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);

        const container = hostData.client.getContainer(containerId);
        const info = await container.inspect();

>>>>>>> parent of 608787c (merge this branch)
=======
>>>>>>> parent of 2f533e4 (Revert "Merge branch 'main' into deployment")
        const networkingConfig = {
            EndpointsConfig: info.NetworkSettings.Networks
        };

        // Create new container first
        const newName = `${info.Name.replace('/', '')}-new`;
        const newContainer = await docker.createContainer({
            Image: info.Config.Image,
            name: newName,
            ...info.Config,
            HostConfig: info.HostConfig,
            NetworkingConfig: networkingConfig
        });

        await newContainer.start();

        // Now safely remove the old one if it was running
        if (info.State.Running) {
            await container.stop();
        }
        await container.remove();

        // Rename new container to old name
        await newContainer.rename({ name: info.Name.replace('/', '') });

        return { action: 'recreate', success: true, newId: newContainer.id };
    } catch (error) {
        console.error(`Failed to recreate container ${containerId}:`, error);
        return { action: 'recreate', success: false, containerId, error: error.message };
    }
}

async function scaleService(serviceName, replicas) {
    try {
<<<<<<< HEAD
        let hostData = hostManager.get(hostId);
        if (!hostData) {
            const connected = hostManager.getConnected();
            if (connected.length > 0) {
                hostData = connected[0];
            }
        }
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);

        const service = hostData.client.getService(serviceName);
=======
        const service = docker.getService(serviceName);
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
        const info = await service.inspect();
        const version = info.Version.Index;

        // Merge new replicas into existing spec
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
        console.error(`Failed to scale service ${serviceName}:`, error);
        return { action: 'scale', replicas, success: false, error: error.message };
    }
}

module.exports = { restartContainer, recreateContainer, scaleService };
