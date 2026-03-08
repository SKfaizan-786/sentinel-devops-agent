const express = require('express');
const router = express.Router();
const monitor = require('../docker/monitor');
const { requireAuth } = require('../auth/middleware');

/**
 * Convert a raw correlator alert into the Incident shape the frontend expects.
 */
function alertToIncident(alert, groupId) {
    const shortId = (alert.containerId || '').slice(0, 12);
    const projectLabel = alert.labels?.['com.docker.compose.project'] || '';
    const serviceLabel = alert.labels?.['com.docker.compose.service'] || shortId;

    return {
        id: `${groupId}-${alert.containerId}-${alert.ts}`,
        title: `Container Failure: ${serviceLabel}`,
        serviceId: alert.containerId,
        status: 'failed',
        severity: 'critical',
        timestamp: new Date(alert.ts).toISOString(),
        duration: 'Action Required',
        rootCause: `${alert.type || 'container_failure'} detected`,
        agentAction: projectLabel ? `Correlated within project "${projectLabel}"` : 'Monitoring',
        agentPredictionConfidence: 0,
        timeline: [],
    };
}

// GET /api/incidents/correlated
router.get('/correlated', requireAuth, (req, res) => {
    try {
        const groups = monitor.getCorrelatedGroups() || [];

        // Enrich each group with incident payloads built from alert data
        const enrichedGroups = groups.map(group => ({
            ...group,
            incidents: (group.alerts || []).map(a => alertToIncident(a, group.groupId)),
        }));

        res.json({ success: true, groups: enrichedGroups });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Since the platform originally fetched incidents via `/api/insights`,
// we can also augment or leave it separate. The frontend will hit this new endpoint.

module.exports = router;

