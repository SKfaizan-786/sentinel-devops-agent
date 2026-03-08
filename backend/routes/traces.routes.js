const express = require('express');
const router = express.Router();

const otelClient = require('../integrations/otel');
const { correlateTracesForIncident } = require('../lib/trace-correlation');

/**
 * GET /api/traces
 *
 * Query distributed traces for a given service and time range.
 * 
 * Query params:
 * - service   (required)  : service name as reported in traces
 * - from      (optional)  : start of window in epoch ms
 * - to        (optional)  : end of window in epoch ms
 * - timestamp (optional)  : incident timestamp in epoch ms for correlation
 */
router.get('/', async (req, res) => {
  const { service, from, to, timestamp } = req.query;

  if (!service) {
    return res.status(400).json({ error: 'Query parameter "service" is required' });
  }

  const now = Date.now();
  const parsedFrom = from ? Number(from) : NaN;
  const parsedTo = to ? Number(to) : NaN;
  const parsedTimestamp = timestamp ? Number(timestamp) : NaN;

  // Validate time range
  if (Number.isFinite(parsedFrom) && Number.isFinite(parsedTo) && parsedFrom > parsedTo) {
    return res.status(400).json({ error: 'Invalid time range: from must be <= to' });
  }

  let startTime = Number.isFinite(parsedFrom) ? parsedFrom : now - 5 * 60 * 1000; // last 5 minutes
  let endTime = Number.isFinite(parsedTo) ? parsedTo : now;

  // If a specific incident timestamp is provided, shrink window around it
  if (Number.isFinite(parsedTimestamp)) {
    const windowMs = 5_000;
    startTime = parsedTimestamp - windowMs;
    endTime = parsedTimestamp + windowMs;
  }

  try {
    const traces = await otelClient.queryTraces(service, startTime, endTime);

    if (!Number.isFinite(parsedTimestamp)) {
      // No incident timestamp: just return raw traces
      return res.json({
        service,
        from: startTime,
        to: endTime,
        traces,
      });
    }

    // With incident timestamp: run correlation to identify likely failure point
    const correlation = correlateTracesForIncident(traces, parsedTimestamp, 5_000);

    return res.json({
      service,
      from: startTime,
      to: endTime,
      ...correlation,
    });
  } catch (error) {
    console.error('Failed to query traces:', error);
    return res.status(500).json({ error: 'Failed to query traces' });
  }
});

module.exports = router;

