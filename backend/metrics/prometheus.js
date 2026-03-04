const client = require('prom-client');

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (process, heap, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics for Sentinel
const metrics = {
  // Service health gauge
  serviceHealth: new client.Gauge({
    name: 'sentinel_service_health',
    help: 'Health status of monitored services (1=healthy, 0=unhealthy)',
    labelNames: ['service', 'environment'],
    registers: [register]
  }),

  // Active incidents gauge
  activeIncidents: new client.Gauge({
    name: 'sentinel_active_incidents',
    help: 'Number of currently active incidents',
    labelNames: ['severity', 'service'],
    registers: [register]
  }),

  // Incidents counter
  incidentsTotal: new client.Counter({
    name: 'sentinel_incidents_total',
    help: 'Total number of incidents detected',
    labelNames: ['severity', 'service', 'type'],
    registers: [register]
  }),

  // Healing actions counter
  healingActionsTotal: new client.Counter({
    name: 'sentinel_healing_actions_total',
    help: 'Total healing actions executed',
    labelNames: ['service', 'action', 'outcome'],
    registers: [register]
  }),

  // Response time histogram
  responseTime: new client.Histogram({
    name: 'sentinel_service_response_seconds',
    help: 'Service response time in seconds',
    labelNames: ['service', 'endpoint'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
    registers: [register]
  }),

  // Agent reasoning duration
  reasoningDuration: new client.Histogram({
    name: 'sentinel_agent_reasoning_seconds',
    help: 'AI agent reasoning time in seconds',
    labelNames: ['decision'],
    buckets: [0.5, 1, 2, 5, 10, 30],
    registers: [register]
  }),

  // API request metrics
  httpRequestsTotal: new client.Counter({
    name: 'sentinel_http_requests_total',
    help: 'Total HTTP requests to Sentinel API',
    labelNames: ['method', 'path', 'status'],
    registers: [register]
  }),

  httpRequestDuration: new client.Histogram({
    name: 'sentinel_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
    registers: [register]
  })
};

module.exports = { register, metrics, client };
