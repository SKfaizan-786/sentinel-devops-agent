/**
 * Runbook Routes
 *
 * RESTful API for creating, reading, updating and deleting runbooks.
 *
 * Security model (matches SLO routes):
 *  - GET  endpoints are public (read-only)
 *  - POST / PUT / DELETE require JWT auth + appropriate permission
 *
 * Bug fixes applied:
 *  - Input validation on POST (name, triggers, actions)
 *  - Command-injection check for run_command actions
 *  - PUT merges with existing row to prevent NULL overwrites
 *  - Unique webhook secret generated per runbook at creation time
 */

'use strict';

const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const { requireAuth, requirePermissions } = require('../auth/middleware');
const { compileRunbook } = require('../healing/runbook-compiler');
const { validateRunCommand } = require('../healing/builtin-templates');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Validate the common fields shared by POST and PUT.
 * Returns an error string or null if valid.
 *
 * @param {Object} body
 * @returns {string|null}
 */
function validateRunbookBody(body) {
    const { name, triggers, actions } = body;

    if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length === 0 || name.length > 255) {
            return 'name must be a non-empty string with max 255 characters';
        }
    }
    if (triggers !== undefined && !Array.isArray(triggers)) {
        return 'triggers must be an array';
    }
    if (actions !== undefined && !Array.isArray(actions)) {
        return 'actions must be an array';
    }

    // Command-injection guard: validate every run_command action
    if (Array.isArray(actions)) {
        for (const action of actions) {
            if (action.type === 'run_command') {
                const result = validateRunCommand(action.parameters?.command);
                if (!result.valid) {
                    return result.reason;
                }
            }
        }
    }

    return null;
}

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/runbooks
 * List all runbooks (public).
 */
router.get('/', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, description, triggers, actions, connections, enabled, created_at, updated_at FROM runbooks ORDER BY created_at DESC'
        );
        res.json({ runbooks: rows });
    } catch (err) {
        console.error('Failed to list runbooks:', err);
        res.status(500).json({ error: 'Failed to fetch runbooks' });
    }
});

/**
 * GET /api/runbooks/:id
 * Get a single runbook (public).
 */
router.get('/:id', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, name, description, triggers, actions, connections, enabled, created_at, updated_at FROM runbooks WHERE id = $1',
            [req.params.id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Runbook not found' });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error('Failed to get runbook:', err);
        res.status(500).json({ error: 'Failed to fetch runbook' });
    }
});

/**
 * POST /api/runbooks
 * Create a new runbook.
 * Requires auth + runbooks:write.
 */
router.post('/', requireAuth, requirePermissions('runbooks:write'), async (req, res) => {
    const { name, description = '', triggers = [], actions = [], connections = [] } = req.body;

    // Input validation
    if (!name || typeof name !== 'string' || name.trim().length === 0 || name.length > 255) {
        return res.status(400).json({ error: 'Invalid name: must be a non-empty string with max 255 characters' });
    }
    if (!Array.isArray(triggers)) {
        return res.status(400).json({ error: 'triggers must be an array' });
    }
    if (!Array.isArray(actions)) {
        return res.status(400).json({ error: 'actions must be an array' });
    }
    if (!Array.isArray(connections)) {
        return res.status(400).json({ error: 'connections must be an array' });
    }

    // Command-injection guard
    for (const action of actions) {
        if (action.type === 'run_command') {
            const result = validateRunCommand(action.parameters?.command);
            if (!result.valid) {
                return res.status(400).json({ error: result.reason });
            }
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Compile to get a unique webhook secret
        const { webhookSecret } = compileRunbook({ id: 'temp', name, triggers, actions });

        const insertResult = await client.query(
            `INSERT INTO runbooks (name, description, triggers, actions, connections, enabled, webhook_secret, created_by)
       VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7)
       RETURNING id, name, description, triggers, actions, connections, enabled, created_at, updated_at`,
            [
                name.trim(),
                description,
                JSON.stringify(triggers),
                JSON.stringify(actions),
                JSON.stringify(connections),
                webhookSecret,
                req.user.userId,
            ]
        );

        const runbook = insertResult.rows[0];

        // Save initial version snapshot
        await client.query(
            `INSERT INTO runbook_versions (runbook_id, version, snapshot, created_by)
       VALUES ($1, 1, $2, $3)`,
            [runbook.id, JSON.stringify(runbook), req.user.userId]
        );

        await client.query('COMMIT');

        // Return the webhook secret ONLY at creation time
        res.status(201).json({ ...runbook, webhookSecret });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to create runbook:', err);
        res.status(500).json({ error: 'Failed to create runbook' });
    } finally {
        client.release();
    }
});

/**
 * PUT /api/runbooks/:id
 * Update a runbook. Merges with existing data to prevent NULL overwrites.
 * Requires auth + runbooks:write.
 */
router.put('/:id', requireAuth, requirePermissions('runbooks:write'), async (req, res) => {
    const { id } = req.params;

    // Validate only the fields that were provided
    const validationError = validateRunbookBody(req.body);
    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Fetch existing row to merge, preventing NULL overwrites
        const existing = await client.query(
            'SELECT * FROM runbooks WHERE id = $1 FOR UPDATE',
            [id]
        );
        if (existing.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Runbook not found' });
        }

        const current = existing.rows[0];
        const merged = {
            name: req.body.name !== undefined ? req.body.name.trim() : current.name,
            description: req.body.description !== undefined ? req.body.description : current.description,
            triggers: req.body.triggers !== undefined ? req.body.triggers : current.triggers,
            actions: req.body.actions !== undefined ? req.body.actions : current.actions,
            connections: req.body.connections !== undefined ? req.body.connections : current.connections,
            enabled: req.body.enabled !== undefined ? Boolean(req.body.enabled) : current.enabled,
        };

        const updateResult = await client.query(
            `UPDATE runbooks
          SET name = $1, description = $2, triggers = $3, actions = $4,
              connections = $5, enabled = $6, updated_at = NOW()
        WHERE id = $7
        RETURNING id, name, description, triggers, actions, connections, enabled, created_at, updated_at`,
            [
                merged.name,
                merged.description,
                JSON.stringify(merged.triggers),
                JSON.stringify(merged.actions),
                JSON.stringify(merged.connections),
                merged.enabled,
                id,
            ]
        );

        const updated = updateResult.rows[0];

        // Append a new version snapshot
        const versionResult = await client.query(
            'SELECT COALESCE(MAX(version), 0) + 1 AS next_version FROM runbook_versions WHERE runbook_id = $1',
            [id]
        );
        const nextVersion = versionResult.rows[0].next_version;

        await client.query(
            `INSERT INTO runbook_versions (runbook_id, version, snapshot, created_by)
       VALUES ($1, $2, $3, $4)`,
            [id, nextVersion, JSON.stringify(updated), req.user.userId]
        );

        await client.query('COMMIT');
        res.json(updated);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed to update runbook:', err);
        res.status(500).json({ error: 'Failed to update runbook' });
    } finally {
        client.release();
    }
});

/**
 * DELETE /api/runbooks/:id
 * Delete a runbook.
 * Requires auth + runbooks:delete.
 */
router.delete('/:id', requireAuth, requirePermissions('runbooks:delete'), async (req, res) => {
    try {
        const result = await pool.query(
            'DELETE FROM runbooks WHERE id = $1 RETURNING id',
            [req.params.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Runbook not found' });
        }
        res.json({ success: true, deleted: result.rows[0].id });
    } catch (err) {
        console.error('Failed to delete runbook:', err);
        res.status(500).json({ error: 'Failed to delete runbook' });
    }
});

/**
 * GET /api/runbooks/:id/versions
 * List all saved versions of a runbook (public).
 */
router.get('/:id/versions', async (req, res) => {
    try {
        const { rows } = await pool.query(
            'SELECT id, version, created_by, created_at FROM runbook_versions WHERE runbook_id = $1 ORDER BY version DESC',
            [req.params.id]
        );
        res.json({ versions: rows });
    } catch (err) {
        console.error('Failed to list versions:', err);
        res.status(500).json({ error: 'Failed to fetch versions' });
    }
});

module.exports = router;
