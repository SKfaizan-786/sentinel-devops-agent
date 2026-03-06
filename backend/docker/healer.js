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
const reasoningEmitter = require('../lib/reasoning-emitter');

function emitReasoningSafe(incidentId, step) {
    try {
        reasoningEmitter.emit_step(incidentId, step);
    } catch (err) {
        console.warn(`Reasoning emit failed for ${incidentId}:`, err?.message || err);
    }
}

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
    const incidentId = `inc-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    
    try {
        const container = docker.getContainer(containerId);
        const info = await container.inspect();
        containerName = info.Name.replace(/^\//, '');

        // Emit: Investigation started
        emitReasoningSafe(incidentId, {
            type: 'investigation_started',
            description: `Started investigating container: ${containerName}`,
            confidence: 0.0
        });

        // --- Memory / Fingerprinting ---
        // Get current metrics to add to fingerprint
        const metrics = containerMonitor.getMetrics(containerId)?.raw || {};
        
        // Emit: Evidence collected - Metrics
        const cpuPercent = Number.isFinite(metrics.cpuPercent) ? metrics.cpuPercent : null;
        const cpuHigh = cpuPercent !== null && cpuPercent > 80;
        emitReasoningSafe(incidentId, {
            type: 'evidence_collected',
            description: cpuPercent === null
                ? 'CPU metric unavailable (threshold: 80%)'
                : cpuHigh
                    ? `High CPU usage detected: ${cpuPercent.toFixed(1)}% (threshold: 80%)`
                    : `CPU usage within limits: ${cpuPercent.toFixed(1)}% (threshold: 80%)`,
            confidence: cpuHigh ? 0.3 : 0.1,
            evidence: {
                metric: 'cpu_percent',
                value: cpuPercent,
                threshold: 80,
                unit: '%',
                breached: cpuHigh
            }
        });

        if (metrics.memPercent > 85) {
            emitReasoningSafe(incidentId, {
                type: 'evidence_collected',
                description: `High memory usage detected: ${metrics.memPercent?.toFixed(1)}% (threshold: 85%)`,
                confidence: 0.35,
                evidence: {
                    metric: 'memory_percent',
                    value: metrics.memPercent,
                    threshold: 85,
                    unit: '%'
                }
            });
        }

        if (info.RestartCount > 0) {
            emitReasoningSafe(incidentId, {
                type: 'evidence_collected',
                description: `Container has restarted ${info.RestartCount} time(s) recently`,
                confidence: 0.4,
                evidence: {
                    metric: 'restart_count',
                    value: info.RestartCount,
                    severity: info.RestartCount > 3 ? 'critical' : 'warning'
                }
            });
        }
        
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
            
            emitReasoningSafe(incidentId, {
                type: 'hypothesis_formed',
                description: `Historical pattern match: Similar incident resolved by "${similarIncidents[0].resolution}" in the past`,
                confidence: 0.55,
                evidence: {
                    matchType: 'historical_pattern',
                    similarIncidentsCount: similarIncidents.length,
                    suggestedResolution: similarIncidents[0].resolution
                }
            });
        } else {
            emitReasoningSafe(incidentId, {
                type: 'hypothesis_formed',
                description: 'No direct historical precedent found. Applying standard remediation protocol.',
                confidence: 0.45,
                evidence: {
                    matchType: 'no_precedent'
                }
            });
        }
        // -------------------------------

        // --- Security Check ---
        emitReasoningSafe(incidentId, {
            type: 'hypothesis_tested',
            description: 'Validating security policies before remediation...',
            confidence: 0.5
        });

        const securityCheck = await performSecurityPrecheck(containerId);
        if (securityCheck.blocked) {
             const errorMsg = securityCheck.error;
             console.error(errorMsg);
             
             emitReasoningSafe(incidentId, {
                type: 'conclusion_reached',
                description: `Security validation FAILED: ${errorMsg}`,
                confidence: 0.95,
                evidence: {
                    securityCheck: 'blocked',
                    reason: errorMsg
                }
             });
             
             return { action: 'restart', success: false, containerId, error: errorMsg, blocked: true, incidentId };
        }
        
        emitReasoningSafe(incidentId, {
            type: 'hypothesis_tested',
            description: 'Security policies validated. Proceeding with container restart.',
            confidence: 0.75
        });
        // ----------------------
=======
const { hostManager } = require('./client');

<<<<<<< HEAD
async function restartContainer(compoundId) {
    try {
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);
>>>>>>> parent of 608787c (merge this branch)

        const container = hostData.client.getContainer(containerId);
=======
        // Emit: Action triggered
        emitReasoningSafe(incidentId, {
            type: 'action_triggered',
            description: `Initiating container restart with 10s timeout...`,
            confidence: 0.8,
            evidence: {
                action: 'restart',
                timeout: 10
            }
        });

>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
        await container.restart({ t: 10 });
<<<<<<< HEAD
<<<<<<< HEAD

=======
        
<<<<<<< HEAD
>>>>>>> parent of c92d731 (feat: Implement core backend container healing, monitoring, and security scanning capabilities, complemented by new frontend host health and selection UI.)
=======
        // Emit: Action completed
        emitReasoningSafe(incidentId, {
            type: 'action_completed',
            description: `Container restart successful. Monitoring for recovery...`,
            confidence: 0.9,
            evidence: {
                action: 'restart',
                status: 'success'
            }
        });
        
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
        // --- Store Incident Outcome ---
        const mttr = Math.floor((Date.now() - startTime) / 1000);
        
        emitReasoningSafe(incidentId, {
            type: 'conclusion_reached',
            description: `Resolution complete. Container restart successful. MTTR: ${mttr}s`,
            confidence: 0.95,
            evidence: {
                action: 'restart',
                status: 'success',
                mttr: mttr
            }
        });

        storeIncident({
            id: incidentId,
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
=======
        return { action: 'restart', success: true, containerId, incidentId };
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
    } catch (error) {
        console.error(`Failed to restart container ${containerId}:`, error);
        
        emitReasoningSafe(incidentId, {
            type: 'conclusion_reached',
            description: `Restart failed: ${error.message}`,
            confidence: 0.95,
            evidence: {
                action: 'restart',
                status: 'failed',
                error: error.message
            }
        });
        
        return { action: 'restart', success: false, containerId, error: error.message, incidentId };
    }
}

async function recreateContainer(containerId) {
    const incidentId = `inc-${Date.now()}-${Math.floor(Math.random()*1000)}`;
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
<<<<<<< HEAD
        // Note: inspect is done inside performSecurityPrecheck, but recreate needs info later?
        // Ah, duplicate inspect is better than polluting logic.
        // Or reuse info? For now, keep it simple.
=======
        
        emitReasoningSafe(incidentId, {
            type: 'investigation_started',
            description: `Started investigating container for recreation: ${containerId}`,
            confidence: 0.0
        });
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
        
        // --- Security Check ---
        emitReasoningSafe(incidentId, {
            type: 'hypothesis_tested',
            description: 'Validating security policies before resource recreation...',
            confidence: 0.5
        });

        const securityCheck = await performSecurityPrecheck(containerId);
        if (securityCheck.blocked) {
             const errorMsg = securityCheck.error;
             console.error(errorMsg);
             
             emitReasoningSafe(incidentId, {
                type: 'conclusion_reached',
                description: `Security validation FAILED: ${errorMsg}`,
                confidence: 0.95,
                evidence: { securityCheck: 'blocked', reason: errorMsg }
             });
             
             return { action: 'recreate', success: false, containerId, error: errorMsg, blocked: true, incidentId };
        }
        
        emitReasoningSafe(incidentId, {
            type: 'hypothesis_tested',
            description: 'Security policies validated. Proceeding with container recreation.',
            confidence: 0.75
        });
        // ----------------------
=======
        const { hostId, containerId } = hostManager.parseId(compoundId);
        const hostData = hostManager.get(hostId);
        if (!hostData || !hostData.client) throw new Error(`Host disconnected: ${hostId}`);
>>>>>>> parent of 608787c (merge this branch)

        const container = hostData.client.getContainer(containerId);
        const info = await container.inspect();
<<<<<<< HEAD
<<<<<<< HEAD
=======
        const info = await container.inspect();

>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
=======
        
        emitReasoningSafe(incidentId, {
            type: 'action_triggered',
            description: `Creating new container to replace ${info.Name.replace('/', '')}...`,
            confidence: 0.8,
            evidence: { action: 'recreate', image: info.Config.Image }
        });

>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
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

        emitReasoningSafe(incidentId, {
            type: 'action_completed',
            description: `New container created and started. Removing old instance...`,
            confidence: 0.85,
            evidence: { newContainerId: newContainer.id }
        });

        // Now safely remove the old one if it was running
        if (info.State.Running) {
            await container.stop();
        }
        await container.remove();

        // Rename new container to old name
        await newContainer.rename({ name: info.Name.replace('/', '') });

        emitReasoningSafe(incidentId, {
            type: 'conclusion_reached',
            description: `Container recreation successful. Old instance removed and replaced.`,
            confidence: 0.95,
            evidence: { action: 'recreate', status: 'success', newId: newContainer.id }
        });

        return { action: 'recreate', success: true, newId: newContainer.id, incidentId };
    } catch (error) {
        console.error(`Failed to recreate container ${containerId}:`, error);
        
        emitReasoningSafe(incidentId, {
            type: 'conclusion_reached',
            description: `Recreation failed: ${error.message}`,
            confidence: 0.95,
            evidence: { action: 'recreate', status: 'failed', error: error.message }
        });
        
        return { action: 'recreate', success: false, containerId, error: error.message, incidentId };
    }
}

async function scaleService(serviceName, replicas) {
    const incidentId = `inc-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    const targetReplicas = Number(replicas);
    if (!Number.isInteger(targetReplicas) || targetReplicas < 0) {
        const errorMsg = `Invalid replica count: ${replicas}`;
        emitReasoningSafe(incidentId, {
            type: 'conclusion_reached',
            description: `Scaling aborted: ${errorMsg}`,
            confidence: 0.95,
            evidence: { action: 'scale', status: 'failed', error: errorMsg }
        });
        return { action: 'scale', replicas, success: false, error: errorMsg, incidentId };
    }

    try {
<<<<<<< HEAD
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
=======
        emitReasoningSafe(incidentId, {
            type: 'investigation_started',
            description: `Analyzing service load for potential scaling: ${serviceName}`,
            confidence: 0.0
        });

>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
        const service = docker.getService(serviceName);
>>>>>>> parent of 6bd84e2 (feat: Implement multi-host Docker management and monitoring with a new dashboard UI.)
        const info = await service.inspect();
        const version = info.Version.Index;
        const currentReplicas = info.Spec.Mode?.Replicated?.Replicas ?? 1;

        emitReasoningSafe(incidentId, {
            type: 'evidence_collected',
            description: `Current replica count: ${currentReplicas}, Target replicas: ${replicas}`,
            confidence: 0.3,
            evidence: {
                metric: 'replica_count',
                current: currentReplicas,
                target: targetReplicas,
                service: serviceName
            }
        });

        emitReasoningSafe(incidentId, {
            type: 'hypothesis_formed',
            description: `Load balancing intervention required. Scaling service to ${replicas} replicas...`,
            confidence: 0.7,
            evidence: {
                action: 'scale',
                reason: 'load_balancing'
            }
        });

        // Merge new replicas into existing spec
        const spec = { ...info.Spec };
        if (!spec.Mode) spec.Mode = {};
        if (!spec.Mode.Replicated) spec.Mode.Replicated = {};
        spec.Mode.Replicated.Replicas = targetReplicas;

        emitReasoningSafe(incidentId, {
            type: 'action_triggered',
            description: `Initiating scaling action to ${replicas} replicas...`,
            confidence: 0.8,
            evidence: {
                action: 'scale',
                targetReplicas: targetReplicas
            }
        });

        await service.update({
            version: version,
            ...spec
        });

        emitReasoningSafe(incidentId, {
            type: 'conclusion_reached',
            description: `Service scaling completed successfully. ${replicas} replicas now active.`,
            confidence: 0.95,
            evidence: {
                action: 'scale',
                status: 'success',
                finalReplicas: targetReplicas
            }
        });

        return { action: 'scale', replicas, success: true, incidentId };
    } catch (error) {
        console.error(`Failed to scale service ${serviceName}:`, error);
        
        emitReasoningSafe(incidentId, {
            type: 'conclusion_reached',
            description: `Scaling failed: ${error.message}`,
            confidence: 0.95,
            evidence: {
                action: 'scale',
                status: 'failed',
                error: error.message
            }
        });
        
        return { action: 'scale', replicas, success: false, error: error.message, incidentId };
    }
}

module.exports = { restartContainer, recreateContainer, scaleService };
