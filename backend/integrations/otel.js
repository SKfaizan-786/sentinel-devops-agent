const axios = require('axios');

class OpenTelemetryClient {
  constructor() {
    // Prefer explicit endpoints, fall back to a sensible Jaeger default
    this.jaegerEndpoint =
      process.env.OTEL_EXPORTER_JAEGER_ENDPOINT || 'http://jaeger:16686';
    this.tempoEndpoint = process.env.OTEL_EXPORTER_TEMPO_ENDPOINT || null;
  }

  /**
   * Build a trace query URL for Jaeger/Tempo style APIs.
   * If the env var already includes an /api path, use it as-is.
   */
  buildTracesUrl(base) {
    if (!base) return null;
    // If the user provided a full /api/... path, don't append anything
    if (base.includes('/api/')) {
      return base;
    }
    // Default Jaeger/Tempo HTTP query API path
    return `${base.replace(/\/+$/, '')}/api/traces`;
  }

  /**
   * Query traces by service name and time range.
   * startTime / endTime are expected in epoch milliseconds.
   *
   * Unit conversions:
   *   Jaeger API expects microseconds  → multiply ms by 1,000
   *   Tempo  API expects seconds       → divide   ms by 1,000
   */
  async queryTraces(serviceName, startTime, endTime) {
    const traces = [];

    // Each candidate carries the correctly-converted start/end for its backend.
    const candidates = [
      { url: this.jaegerEndpoint, multiplier: 1000 },    // ms → µs
      { url: this.tempoEndpoint, multiplier: 0.001 }     // ms → s
    ];

    for (const { url, multiplier } of candidates) {
      if (!url) continue;
      try {
        const response = await axios.get(this.buildTracesUrl(url), {
          params: {
            service: serviceName,
            start: Math.floor(startTime * multiplier),
            end: Math.floor(endTime * multiplier),
            limit: 50,
          },
          timeout: 5000,
        });
        if (response.data && Array.isArray(response.data.data)) {
          traces.push(...response.data.data);
        }
        // If one backend succeeds, stop trying others
        if (traces.length > 0) {
          break;
        }
      } catch (err) {
        console.warn('OpenTelemetry trace query failed:', err.message);
      }
    }

    return traces;
  }

  /**
   * Find the first span in a trace whose OpenTelemetry status is ERROR.
   */
  findFailingSpan(trace) {
    if (!trace || !Array.isArray(trace.spans)) return null;

    for (const span of trace.spans) {
      const statusTag = (span.tags || []).find(
        (t) => t.key === 'otel.status_code'
      );
      if (statusTag && statusTag.value === 'ERROR') {
        return span;
      }
    }
    return null;
  }

  /**
   * Extract a compact failure context object from an error span.
   */
  extractFailureContext(failingSpan) {
    if (!failingSpan) return null;

    const tags = failingSpan.tags || [];
    const findTag = (key) => tags.find((t) => t.key === key)?.value;

    return {
      operation: failingSpan.operationName,
      service:
        failingSpan.processID?.serviceName ||
        findTag('service.name') ||
        findTag('peer.service') ||
        null,
      errorMessage:
        findTag('error.object') ||
        findTag('exception.message') ||
        findTag('error') ||
        null,
      duration: failingSpan.duration,
      spanId: failingSpan.spanID,
      traceId: failingSpan.traceID || failingSpan.traceId || null,
    };
  }
}

module.exports = new OpenTelemetryClient();

