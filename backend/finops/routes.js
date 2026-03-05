const express = require('express');
const router = express.Router();
const pool = require('../db/config');
const { runAnalysis, getSummary, getHeatmapData } = require('./analyzer');
const { docker } = require('../docker/client');
const requireAuth = require('../middleware/auth');

// GET /api/finops/summary
router.get('/summary', async (req, res) => {
    try {
        const summary = await getSummary();
        res.json(summary);
    } catch (error) {
        console.error('FinOps summary error:', error.message);
        res.status(500).json({ error: 'Failed to fetch FinOps summary' });
    }
});

// GET /api/finops/recommendations
router.get('/recommendations', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM finops_recommendations
            ORDER BY
                CASE status WHEN 'pending' THEN 0 WHEN 'applied' THEN 1 ELSE 2 END,
                estimated_savings_monthly DESC
        `);
        res.json({ recommendations: result.rows });
    } catch (error) {
        console.error('FinOps recommendations error:', error.message);
        res.status(500).json({ error: 'Failed to fetch recommendations' });
    }
});

// GET /api/finops/heatmap
router.get('/heatmap', async (req, res) => {
    try {
        const data = await getHeatmapData();
        res.json({ heatmap: data });
    } catch (error) {
        console.error('FinOps heatmap error:', error.message);
        res.status(500).json({ error: 'Failed to fetch heatmap data' });
    }
});

// POST /api/finops/analyze — trigger AI analysis
router.post('/analyze', requireAuth, async (req, res) => {
    try {
        const result = await runAnalysis();
        res.json(result);
    } catch (error) {
        console.error('FinOps analysis error:', error.message);
        res.status(500).json({ error: 'Analysis failed' });
    }
});

// POST /api/finops/recommendations/:id/apply
router.post('/recommendations/:id/apply', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        // Fetch the pending recommendation
        const recResult = await pool.query(
            "SELECT * FROM finops_recommendations WHERE id = $1 AND status = 'pending'", [id]
        );
        if (recResult.rows.length === 0) {
            return res.status(404).json({ error: 'Recommendation not found or not in pending state' });
        }

        const rec = recResult.rows[0];

        // Attempt to update container resource limits via Docker API
        try {
            const container = docker.getContainer(rec.container_id);
            const newMemoryBytes = Math.round(rec.recommended_memory_limit_mb * 1024 * 1024);
            await container.update({
                Memory: newMemoryBytes,
                MemorySwap: newMemoryBytes * 2
            });
        } catch (dockerError) {
            console.warn(`Docker update for ${rec.container_name} failed:`, dockerError.message);
            return res.status(500).json({ error: 'Docker update failed. Recommendation kept pending.' });
        }

        // Mark as applied safely
        await pool.query(
            `UPDATE finops_recommendations SET status = 'applied', updated_at = NOW() WHERE id = $1 AND status = 'pending'`,
            [id]
        );

        res.json({ success: true, message: `Recommendation applied for ${rec.container_name}` });
    } catch (error) {
        console.error('FinOps apply error:', error.message);
        res.status(500).json({ error: 'Failed to apply recommendation' });
    }
});

// POST /api/finops/recommendations/:id/dismiss
router.post('/recommendations/:id/dismiss', requireAuth, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            `UPDATE finops_recommendations SET status = 'dismissed', updated_at = NOW() WHERE id = $1 AND status = 'pending' RETURNING *`,
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recommendation not found or not in pending state' });
        }
        res.json({ success: true, message: 'Recommendation dismissed' });
    } catch (error) {
        console.error('FinOps dismiss error:', error.message);
        res.status(500).json({ error: 'Failed to dismiss recommendation' });
    }
});

module.exports = router;
