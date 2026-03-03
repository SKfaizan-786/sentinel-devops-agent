const express = require('express');
const router = express.Router();
const { listContainers } = require('../docker/client');
const { calculateContainerCost, PRICING_PRESETS } = require('../docker/cost-analyzer');

router.get('/summary', async (req, res) => {
    try {
        const { preset = 'aws' } = req.query;

        if (!PRICING_PRESETS[preset]) {
            return res.status(400).json({ error: `Invalid cloud preset: ${preset}` });
        }

        const containers = await listContainers();
        const reports = containers.map(c => calculateContainerCost(c, preset));

        const totalSpend = reports.reduce((s, r) => s + r.monthlyEstimate, 0);
        const totalSavings = reports.reduce((s, r) => s + r.potentialSavingsMonthly, 0);
        const wastePercent = totalSpend > 0 ? parseFloat((totalSavings / totalSpend * 100).toFixed(1)) : 0;

        res.json({
            totalMonthlyEstimate: parseFloat(totalSpend.toFixed(2)),
            totalPotentialSavings: parseFloat(totalSavings.toFixed(2)),
            wastePercent,
            cloudPreset: preset,
            containers: reports.sort((a, b) => b.monthlyEstimate - a.monthlyEstimate),
        });
    } catch (error) {
        console.error('FinOps summary error:', error);
        res.status(500).json({ error: 'Failed to generate FinOps summary' });
    }
});

module.exports = router;
