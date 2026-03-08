const express = require('express');
const router = express.Router();
const { updateFeedback } = require('../db/incident-memory');

router.post('/:incidentId', (req, res) => {
    try {
        const { incidentId } = req.params;
        const { isPositive } = req.body;
        
        if (typeof isPositive !== 'boolean') {
            return res.status(400).json({ error: 'Missing isPositive boolean' });
        }

        const value = isPositive ? 1 : -1;
        const success = updateFeedback(incidentId, value);
        
        if (success) {
            res.json({ message: 'Feedback recorded' });
        } else {
            res.status(404).json({ error: 'Incident not found' });
        }
    } catch (e) {
        console.error("Feedback endpoint error:", e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
