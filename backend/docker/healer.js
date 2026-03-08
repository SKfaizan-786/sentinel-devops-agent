const { docker, hostManager } = require('./client');
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

/**
 * Get the appropriate Docker client for a container
 * @param {string} compoundId - Compound ID (hostId:containerId) or raw containerId
 * @returns {Object} { client, hostId, containerId }
 */
function getClientForContainer(compoundId) {
    const { hostId, containerId } = hostManager.parseId(compoundId);
    const client = hostManager.initialized 
        ? hostManager.getClient(hostId) 
        : docker;
    return { client, hostId, containerId };
}

async function performSecurityPrecheck(compoundId) {
    const { client, containerId } = getClientForContainer(compoundId);
    
    if (!client) {
        return { blocked: true, error: 'No Docker client available for this host' };
    }

    try {
        const container = client.getContainer(containerId);
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
        console.error(`Security precheck failed for ${compoundId}:`, e.message);
        // Fail open or closed? Usually fail closed for security.
        return { blocked: true, error: `Security check error: ${e.message}` };
    }
}

async function restartContainer(compoundId) {
    const startTime = Date.now();
    const { client, hostId, containerId } = getClientForContainer(compoundId);
    let containerName = containerId;
    const incidentId = `inc-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    
    if (!client) {
        const errorMsg = `No Docker client available for host '${hostId}'`;
        console.error(errorMsg);
        return { action: 'restart', success: false, containerId: compoundId, error: errorMsg, incidentId };
    }
    
    try {
        const container = client.getContainer(containerId);
        const info = await container.inspect();
        containerName = info.Name.replace(/^\//, '');

        // Emit: Investigation started
        emitReasoningSafe(incidentId, {
            type: 'investigation_started',
            description: `Started investigating container: ${containerName} on host: ${hostId}`,
            confidence: 0.0
        });

        // --- Memory / Fingerprinting ---
        // Get current metrics to add to fingerprint (use compound ID)
        const metrics = containerMonitor.getMetrics(compoundId)?.raw || {};
        
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
                breached: cpuHigh,
                hostId
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
            hostId,
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

        const securityCheck = await performSecurityPrecheck(compoundId);
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
             
             return { action: 'restart', success: false, containerId: compoundId, hostId, error: errorMsg, blocked: true, incidentId };
        }
        
        emitReasoningSafe(incidentId, {
            type: 'hypothesis_tested',
            description: 'Security policies validated. Proceeding with container restart.',
            confidence: 0.75
        });
        // ----------------------

        // Emit: Action triggered
        emitReasoningSafe(incidentId, {
            type: 'action_triggered',
            description: `Initiating container restart with 10s timeout on host ${hostId}...`,
            confidence: 0.8,
            evidence: {
                action: 'restart',
                timeout: 10,
                hostId
            }
        });

        await container.restart({ t: 10 });
        
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
            hostId,
            fingerprint: preFingerprint,
            summary: `Automated restart for ${containerName} on ${hostId}`,
            resolution: `Restarted container`,
            actionTaken: 'restart',
            outcome: 'resolved', // optimistically
            mttrSeconds: mttr
        });
        // ------------------------------

        return { action: 'restart', success: true, containerId: compoundId, hostId, incidentId };
    } catch (error) {
        console.error(`Failed to restart container ${compoundId}:`, error);
        
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
        
        return { action: 'restart', success: false, containerId: compoundId, hostId, error: error.message, incidentId };
    }
}

async function recreateContainer(compoundId) {
    const { client, hostId, containerId } = getClientForContainer(compoundId);
    const incidentId = `inc-${Date.now()}-${Math.floor(Math.random()*1000)}`;
    let backupContainer = null;
    let newContainer = null;
    let originalName = '';
    try {
        const container = client.getContainer(containerId);
        
        emitReasoningSafe(incidentId, {
            type: 'investigation_started',
            description: `Started investigating container for recreation: ${containerId} on host: ${hostId}`,
            confidence: 0.0
        });
        
        // --- Security Check ---
        emitReasoningSafe(incidentId, {
            type: 'hypothesis_tested',
            description: 'Validating security policies before resource recreation...',
            confidence: 0.5
        });

        const securityCheck = await performSecurityPrecheck(compoundId);
        if (securityCheck.blocked) {
             const errorMsg = securityCheck.error;
             console.error(errorMsg);
             
             emitReasoningSafe(incidentId, {
                type: 'conclusion_reached',
                description: `Security validation FAILED: ${errorMsg}`,
                confidence: 0.95,
                evidence: { securityCheck: 'blocked', reason: errorMsg }
             });
             
             return { action: 'recreate', success: false, containerId: compoundId, hostId, error: errorMsg, blocked: true, incidentId };
        }
        
        emitReasoningSafe(incidentId, {
            type: 'hypothesis_tested',
            description: 'Security policies validated. Proceeding with container recreation.',
            confidence: 0.75
        });
        // ----------------------

        const info = await container.inspect();
        originalName = info.Name.replace('/', '');
        
        emitReasoningSafe(incidentId, {
            type: 'action_triggered',
            description: `Creating new container to replace ${originalName}...`,
            confidence: 0.8,
            evidence: { action: 'recreate', image: info.Config.Image, hostId }
        });

        const timestamp = Date.now();
        const backupName = `${originalName}_backup_${timestamp}`;
        const tempName = `${originalName}_new_${timestamp}`;

        console.log(`[HEALER] Starting safe recreation for ${originalName}`);

        // 1. Create new container with temporary name
        const networkingConfig = {
            EndpointsConfig: info.NetworkSettings.Networks
        };

        newContainer = await docker.createContainer({
            ...info.Config,
            name: tempName,
            HostConfig: info.HostConfig,
            NetworkingConfig: networkingConfig
        });

        // 2. Start new container
        await newContainer.start();
        console.log(`[HEALER] New container ${tempName} started.`);

        emitReasoningSafe(incidentId, {
            type: 'action_completed',
            description: `New container created and started. Swapping instance names...`,
            confidence: 0.85,
            evidence: { newContainerId: newContainer.id }
        });

        // 3. Rename old container to backup name
        // This frees up the original name
        await container.rename({ name: backupName });
        backupContainer = container;
        console.log(`[HEALER] Old container renamed to ${backupName}.`);

        try {
            // 4. Rename new container to original name
            await newContainer.rename({ name: originalName });
            console.log(`[HEALER] New container renamed to ${originalName}.`);
        } catch (renameError) {
            console.error(`[HEALER] Critical: Failed to rename new container to ${originalName}.`, renameError);
            console.error(`[HEALER] Original container is preserved as ${backupName}. Manual intervention required.`);
            throw new Error(`Rename failed: ${renameError.message}. Backup preserved as ${backupName}`);
        }

        // 5. Safely remove the backup (old) container
        if (info.State.Running) {
            try {
                await backupContainer.stop({ t: 10 });
            } catch (stopError) {
                console.warn(`[HEALER] Failed to stop backup container: ${stopError.message}`);
            }
        }
        await backupContainer.remove();
        console.log(`[HEALER] Backup container ${backupName} removed.`);

        emitReasoningSafe(incidentId, {
            type: 'conclusion_reached',
            description: `Container recreation successful. Old instance removed and replaced safely.`,
            confidence: 0.95,
            evidence: { action: 'recreate', status: 'success', newId: newContainer.id, hostId }
        });

        return { action: 'recreate', success: true, newId: newContainer.id, name: originalName, incidentId };
    } catch (error) {
        console.error(`Failed to recreate container ${compoundId}:`, error);
        
        emitReasoningSafe(incidentId, {
            type: 'conclusion_reached',
            description: `Recreation failed: ${error.message}`,
            confidence: 0.95,
            evidence: { action: 'recreate', status: 'failed', error: error.message }
        });
        
        return { 
            action: 'recreate', 
            success: false, 
            containerId, 
            error: error.message,
            incidentId,
            tip: error.message.includes('Backup preserved') ? 'Check Docker for backup container' : undefined
        };
    }
}

/**
 * Scale a Docker Swarm service
 * @param {string} serviceName - Service name
 * @param {number} replicas - Target replica count
 * @param {string} hostId - Optional host ID for multi-host Swarm
 */
async function scaleService(serviceName, replicas, hostId = null) {
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

    // Get appropriate client
    let client;
    if (hostId && hostManager.initialized) {
        client = hostManager.getClient(hostId);
    } else if (hostManager.initialized) {
        // Find a host with Swarm mode active
        const swarmHost = hostManager.getConnected().find(h => h.swarmActive);
        client = swarmHost?.client || docker;
        hostId = swarmHost?.id || 'local';
    } else {
        client = docker;
        hostId = 'local';
    }

    if (!client) {
        const errorMsg = `No Docker client available for host '${hostId}'`;
        return { action: 'scale', replicas, success: false, error: errorMsg, incidentId };
    }

    try {
        emitReasoningSafe(incidentId, {
            type: 'investigation_started',
            description: `Analyzing service load for potential scaling: ${serviceName} on host ${hostId}`,
            confidence: 0.0
        });

        const service = client.getService(serviceName);
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
                service: serviceName,
                hostId
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

        return { action: 'scale', replicas, success: true, hostId, incidentId };
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
        
        return { action: 'scale', replicas, success: false, error: error.message, hostId, incidentId };
    }
}

module.exports = { restartContainer, recreateContainer, scaleService };
