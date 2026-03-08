const otelClient = require('../integrations/otel');

/**
 * Normalize a Jaeger/Tempo span startTime to milliseconds since epoch.
 * Jaeger typically uses microseconds; Tempo may use milliseconds.
 */
function toMillis(startTime) {
  if (!startTime || typeof startTime !== 'number') return null;
  // Normalize based on magnitude:
  // - nanoseconds:   > 1e15  -> divide by 1e6
  // - microseconds:  > 1e12  -> divide by 1e3
  // - milliseconds:  otherwise (returned as-is)
  if (startTime > 1e15) {
    return Math.floor(startTime / 1e6);
  }
  if (startTime > 1e12) {
    return Math.floor(startTime / 1e3);
  }
  return startTime;
}

/**
 * Enrich spans with service names from the trace.processes map when present.
 */
function attachServiceNames(trace) {
  if (!trace || !trace.processes || !Array.isArray(trace.spans)) return trace;

  const processes = trace.processes;
  trace.spans = trace.spans.map((span) => {
    const processMeta = processes[span.processID];
    return processMeta?.serviceName
      ? { ...span, serviceName: processMeta.serviceName }  // New field
      : { ...span };
  });

  return trace;
}

/**
 * Given a list of traces and an incident timestamp, find the trace/span
 * that most likely represents the root cause within a ±windowMs window.
 */
function correlateTracesForIncident(traces, incidentTimestampMs, windowMs = 5000) {
  if (!Array.isArray(traces) || !incidentTimestampMs) {
    return {
      incidentTimestamp: incidentTimestampMs || null,
      windowMs,
      rootCause: null,
      traces: traces || [],
    };
  }

  const annotated = [];

  for (const rawTrace of traces) {
    const trace = attachServiceNames({ ...rawTrace });
    const spans = trace.spans || [];
    if (!spans.length) continue;

    const failingSpan = otelClient.findFailingSpan(trace);
    const failureContext = otelClient.extractFailureContext(failingSpan);

    // Use the earliest span start time as the trace "start"
    const startTimesMs = spans
      .map((s) => toMillis(s.startTime))
      .filter((v) => typeof v === 'number');
    if (!startTimesMs.length) continue;

    const traceStartMs = Math.min(...startTimesMs);
    const deltaMs = Math.abs(traceStartMs - incidentTimestampMs);

    annotated.push({
      trace,
      failingSpan,
      failureContext,
      traceStartMs,
      deltaMs,
    });
  }

  if (!annotated.length) {
    return {
      incidentTimestamp: incidentTimestampMs,
      windowMs,
      rootCause: null,
      traces,
    };
  }

  // Pick the trace whose start is closest to the incident within ±windowMs
  annotated.sort((a, b) => a.deltaMs - b.deltaMs);
  const best = annotated[0];

  if (best.deltaMs > windowMs) {
    return {
      incidentTimestamp: incidentTimestampMs,
      windowMs,
      rootCause: null,
      traces,
    };
  }

  return {
    incidentTimestamp: incidentTimestampMs,
    windowMs,
    rootCause: best.failureContext || null,
    traces,
  };
}

module.exports = {
  toMillis,
  attachServiceNames,
  correlateTracesForIncident,
};

