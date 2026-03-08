/**
 * SLO Routes
 * 
 * RESTful API endpoints for SLO/SLA tracking and error budget management.
 * Read endpoints are public; mutating endpoints require auth + RBAC.
 */

const express = require('express');
const router = express.Router();
const sloModel = require('../models/slo-definition');
const tracker = require('../slo/tracker');
const { calculateErrorBudget, generateBurndownData, MINUTES_PER_WINDOW } = require('../slo/calculator');
const { requireAuth, requirePermissions } = require('../auth/middleware');
const { validateBody, validateQuery, validateParams } = require('../validation/middleware');
const {
  createSLOSchema,
  updateSLOSchema,
  recordDowntimeSchema,
  burndownQuerySchema,
  sloIdParamSchema,
} = require('../validation/slo.validation');

/**
 * GET /api/slo
 * List all SLO definitions with computed error budgets.
 */
router.get('/', (req, res) => {
    try {
        const slos = sloModel.getAll();
        const results = slos.map(slo => {
            const incidents = tracker.getIncidents(slo.serviceId);
            const budget = calculateErrorBudget(slo, incidents);
            return { ...slo, budget };
        });

        // Summary stats
        const totalSLOs = results.length;
        const healthyCount = results.filter(r => r.budget.status === 'healthy').length;
        const warningCount = results.filter(r => r.budget.status === 'warning').length;
        const criticalCount = results.filter(r => r.budget.status === 'critical' || r.budget.status === 'exhausted').length;

        res.json({
            slos: results,
            summary: {
                total: totalSLOs,
                healthy: healthyCount,
                warning: warningCount,
                critical: criticalCount,
            },
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/slo/:id
 * Get a single SLO definition with full budget breakdown.
 */
router.get('/:id', validateParams(sloIdParamSchema), (req, res) => {
    try {
        const slo = sloModel.getById(req.params.id);
        if (!slo) {
            return res.status(404).json({ error: 'SLO definition not found' });
        }

        const incidents = tracker.getIncidents(slo.serviceId);
        const budget = calculateErrorBudget(slo, incidents);
        const burndown = generateBurndownData(slo, incidents);

        res.json({ ...slo, budget, burndown, incidents });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/slo
 * Create a new SLO definition.
 * Requires authentication and slo:write permission.
 * Validates: serviceId, serviceName, targetAvailability, trackingWindow
 */
router.post('/', requireAuth, requirePermissions('slo:write'), validateBody(createSLOSchema), (req, res) => {
    try {
        const slo = sloModel.create(req.body);
        res.status(201).json(slo);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * PUT /api/slo/:id
 * Update an existing SLO definition.
 * Requires authentication and slo:write permission.
 * Validates: targetAvailability, trackingWindow, serviceName
 */
router.put('/:id', requireAuth, requirePermissions('slo:write'), validateParams(sloIdParamSchema), validateBody(updateSLOSchema), (req, res) => {
    try {
        const slo = sloModel.update(req.params.id, req.body);
        if (!slo) {
            return res.status(404).json({ error: 'SLO definition not found' });
        }
        res.json(slo);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * DELETE /api/slo/:id
 * Delete an SLO definition.
 * Requires authentication and slo:delete permission.
 */
router.delete('/:id', requireAuth, requirePermissions('slo:delete'), validateParams(sloIdParamSchema), (req, res) => {
    try {
        const slo = sloModel.getById(req.params.id);
        if (!slo) {
            return res.status(404).json({ error: 'SLO definition not found' });
        }

        const deleted = sloModel.remove(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'SLO definition not found' });
        }
        tracker.clearService(slo.serviceId);
        res.json({ success: true, message: 'SLO definition deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/slo/:id/downtime
 * Record a downtime event for the service associated with this SLO.
 * Requires authentication and slo:write permission.
 * Validates: downtimeMinutes (positive number), description (optional string)
 */
router.post('/:id/downtime', requireAuth, requirePermissions('slo:write'), validateParams(sloIdParamSchema), validateBody(recordDowntimeSchema), (req, res) => {
    try {
        const slo = sloModel.getById(req.params.id);
        if (!slo) {
            return res.status(404).json({ error: 'SLO definition not found' });
        }

        const { downtimeMinutes, description } = req.body;

        const event = tracker.recordDowntime(slo.serviceId, downtimeMinutes, description || '');

        // Recalculate budget after recording
        const incidents = tracker.getIncidents(slo.serviceId);
        const budget = calculateErrorBudget(slo, incidents);

        res.status(201).json({ event, budget });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * GET /api/slo/:id/burndown
 * Get burndown chart data for an SLO.
 * Optional: points query parameter (1-100, default 30)
 */
router.get('/:id/burndown', validateParams(sloIdParamSchema), validateQuery(burndownQuerySchema), (req, res) => {
    try {
        const slo = sloModel.getById(req.params.id);
        if (!slo) {
            return res.status(404).json({ error: 'SLO definition not found' });
        }

        const windowMinutes = MINUTES_PER_WINDOW[slo.trackingWindow];
        const windowStart = Date.now() - windowMinutes * 60 * 1000;
        const incidents = tracker.getIncidents(slo.serviceId).filter(i => i.resolvedAt >= windowStart);

        const points = req.query.points;
        const burndown = generateBurndownData(slo, incidents, points);

        res.json({ burndown });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
