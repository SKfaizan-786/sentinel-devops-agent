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

    // Prefer Jaeger if configured, otherwise try Tempo
    const candidates = [
      this.buildTracesUrl(this.jaegerEndpoint),
      this.buildTracesUrl(this.tempoEndpoint),
    ].filter(Boolean);

    for (const url of candidates) {
      try {
        const response = await axios.get(url, {
          params: {
            service: serviceName,
            start: startTime,
            end: endTime,
            limit: 50,
          },
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

