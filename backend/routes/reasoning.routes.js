const express = require('express');
const reasoningEmitter = require('../lib/reasoning-emitter');

const router = express.Router();

/**
 * GET /api/reasoning/stream/:incidentId
 * Server-Sent Events (SSE) endpoint that streams reasoning steps for an incident
 * 
 * Returns: Event stream with reasoning steps
 */
router.get('/stream/:incidentId', (req, res) => {
  const { incidentId } = req.params;
  const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim());
  const requestOrigin = req.get('Origin');
  let allowedOrigin = allowedOrigins[0];
  
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    allowedOrigin = requestOrigin;
  } else if (allowedOrigins.includes('*')) {
    allowedOrigin = '*';
  }

  // Set SSE headers
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  });

  // Handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }

  const sent = new Set();
  const getStepKey = (step) =>
    step.stepIndex ?? `${step.ts ?? 'na'}:${step.type}:${step.description}`;

  // Register listener first to close the replay/subscribe race.
  const handler = (step) => {
    if (step.incidentId !== incidentId) return;
    const key = getStepKey(step);
    if (sent.has(key)) return;
    sent.add(key);
    res.write(`data: ${JSON.stringify(step)}\n\n`);
  };
  reasoningEmitter.on(`incident:${incidentId}`, handler);

  // Replay history (deduped against in-flight deliveries).
  const history = reasoningEmitter.getHistory(incidentId);
  history.forEach(step => {
    const key = getStepKey(step);
    if (sent.has(key)) return;
    sent.add(key);
    res.write(`data: ${JSON.stringify(step)}\n\n`);
  });

  // Handle client disconnect
  req.on('close', () => {
    reasoningEmitter.off(`incident:${incidentId}`, handler);
    res.end();
  });

  // Keep connection alive with periodic comments
  const keepAlive = setInterval(() => {
    res.write(': keep-alive\n\n');
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

/**
 * GET /api/reasoning/history/:incidentId
 * Get the complete reasoning history for an incident
 * 
 * Returns: { steps: [], stats: { ... } }
 */
router.get('/history/:incidentId', (req, res) => {
  const { incidentId } = req.params;

  try {
    const history = reasoningEmitter.getHistory(incidentId);
    res.json({
      incidentId,
      steps: history,
      stats: {
        totalSteps: history.length,
        startTime: history[0]?.ts || null,
        endTime: history[history.length - 1]?.ts || null,
        duration: history.length > 0 ? history[history.length - 1].ts - history[0].ts : 0
      }
    });
  } catch (error) {
    console.error(`Error fetching reasoning history for ${incidentId}:`, error);
    res.status(500).json({ error: 'Failed to fetch reasoning history' });
  }
});

/**
 * DELETE /api/reasoning/history/:incidentId
 * Clear the reasoning history for an incident
 * 
 * Returns: { success: true }
 */
router.delete('/history/:incidentId', (req, res) => {
  const { incidentId } = req.params;

  try {
    reasoningEmitter.clearHistory(incidentId);
    res.json({ success: true, message: `Cleared history for incident ${incidentId}` });
  } catch (error) {
    console.error(`Error clearing reasoning history for ${incidentId}:`, error);
    res.status(500).json({ error: 'Failed to clear reasoning history' });
  }
});

/**
 * GET /api/reasoning/stats
 * Get overall reasoning emitter statistics
 * 
 * Returns: { incidentsTracked: number, totalSteps: number }
 */
router.get('/stats', (req, res) => {
  try {
    const stats = reasoningEmitter.getStats();
    res.json(stats);
  } catch (error) {
    console.error('Error fetching reasoning stats:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
