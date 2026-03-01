const { docker } = require('./client');
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

        await container.restart({ t: 10 });
        
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

        return { action: 'restart', success: true, containerId };
    } catch (error) {
        console.error(`Failed to restart container ${compoundId}:`, error);
        return { action: 'restart', success: false, containerId: compoundId, error: error.message };
    }
}

async function recreateContainer(compoundId) {
    try {
        const container = docker.getContainer(containerId);
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
        console.error(`Failed to recreate container ${compoundId}:`, error);
        return { action: 'recreate', success: false, containerId: compoundId, error: error.message };
    }
}

async function scaleService(serviceName, replicas, hostId = 'local') {
    try {
        const hostData = hostManager.get(hostId); // Typically swarm is host specific
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
        console.error(`Failed to scale service ${serviceName}:`, error);
        return { action: 'scale', replicas, success: false, error: error.message };
    }
}

module.exports = { restartContainer, recreateContainer, scaleService };
