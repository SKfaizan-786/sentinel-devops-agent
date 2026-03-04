/**
 * @fileoverview Approval workflow routes for Human-in-the-Loop healing actions
 * @module backend/routes/approvals
 */

const express = require('express');
const router = express.Router();
const { requireAuth, requireRole } = require('../auth/middleware');
const healer = require('../docker/healer');

// --- IN-MEMORY PENDING ACTIONS STORE ---
const pendingActions = new Map(); // id -> { id, service, action, containerId, status, createdAt, resolvedAt, resolvedBy }
let nextActionId = 1;

/**
 * Create a new pending approval action (called by Kestra or internal systems)
 * POST /api/approvals/pending
 * Body: { service, action, containerId, reason }
 */
router.post('/pending', (req, res) => {
    const { service, action, containerId, reason } = req.body;

    if (!service || !action) {
        return res.status(400).json({ error: 'Missing required fields: service, action' });
    }

    const id = `approval-${nextActionId++}`;
    const pendingAction = {
        id,
        service,
        action: action || 'restart',
        containerId: containerId || null,
        reason: reason || `Service ${service} is unhealthy`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        resolvedAt: null,
        resolvedBy: null
    };

    pendingActions.set(id, pendingAction);
    console.log(`[APPROVAL] New pending action: ${id} - ${action} ${service}`);

    res.status(201).json({ success: true, pendingAction });
});

/**
 * List all pending actions
 * GET /api/approvals/pending
 */
router.get('/pending', (req, res) => {
    const actions = Array.from(pendingActions.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ actions });
});

/**
 * Approve a pending action (requires admin or operator role)
 * POST /api/approvals/:id/approve
 */
router.post('/:id/approve', requireAuth, requireRole('Admin'), async (req, res) => {
    const { id } = req.params;
    const action = pendingActions.get(id);

    if (!action) {
        return res.status(404).json({ error: 'Pending action not found' });
    }

    if (action.status !== 'pending') {
        return res.status(400).json({ error: `Action already ${action.status}` });
    }

    // Execute the healing action
    let result = { success: false, reason: 'Unknown action type' };
    try {
        if (action.action === 'restart' && action.containerId) {
            result = await healer.restartContainer(action.containerId);
        } else if (action.action === 'recreate' && action.containerId) {
            result = await healer.recreateContainer(action.containerId);
        } else {
            result = { success: false, reason: `Cannot execute action '${action.action}' without a valid containerId` };
        }
    } catch (err) {
        result = { success: false, reason: err.message };
    }

    // Update the action status
    action.status = 'approved';
    action.resolvedAt = new Date().toISOString();
    action.resolvedBy = req.user?.email || req.user?.userId || 'unknown';
    action.result = result;
    pendingActions.set(id, action);

    console.log(`[APPROVAL] Action ${id} APPROVED by ${action.resolvedBy}`);
    res.json({ success: true, action });
});

/**
 * Reject a pending action (requires admin or operator role)
 * POST /api/approvals/:id/reject
 */
router.post('/:id/reject', requireAuth, requireRole('Admin'), (req, res) => {
    const { id } = req.params;
    const action = pendingActions.get(id);

    if (!action) {
        return res.status(404).json({ error: 'Pending action not found' });
    }

    if (action.status !== 'pending') {
        return res.status(400).json({ error: `Action already ${action.status}` });
    }

    action.status = 'rejected';
    action.resolvedAt = new Date().toISOString();
    action.resolvedBy = req.user?.email || req.user?.userId || 'unknown';
    pendingActions.set(id, action);

    console.log(`[APPROVAL] Action ${id} REJECTED by ${action.resolvedBy}`);
    res.json({ success: true, action });
});

module.exports = router;
