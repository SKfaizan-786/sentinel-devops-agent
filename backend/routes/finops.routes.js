const express = require('express');
const router = express.Router();
const { listContainers } = require('../docker/client');
const { calculateContainerCost } = require('../docker/cost-analyzer');

router.get('/summary', async (req, res) => {
    try {
        const { preset = 'aws' } = req.query;
        const containers = await listContainers();
        const reports = containers.map(c => calculateContainerCost(c, preset));

        const totalSpend = reports.reduce((s, r) => s + r.monthlyEstimate, 0);
        const totalSavings = reports.reduce((s, r) => s + r.potentialSavingsMonthly, 0);
        const wastePercent = totalSpend > 0 ? (totalSavings / totalSpend * 100).toFixed(1) : 0;

        res.json({
            totalMonthlyEstimate: totalSpend.toFixed(2),
            totalPotentialSavings: totalSavings.toFixed(2),
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
