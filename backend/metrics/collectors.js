const { metrics } = require('./prometheus');
const { getAllServices, getSystemStatus } = require('../services/monitor');
const { getActiveIncidents } = require('../services/incidents'); // Although incident tracking is weak currently

// Collect service health metrics
async function collectServiceMetrics() {
  const services = getAllServices(); // This is synchronous now in my impl
  
  if (!services) return;

  // Assuming getAllServices returns the array of service objects
  // The service objects from monitor.js are { name, url, status, code, lastUpdated }
  
  for (const service of services) {
    if (!service) continue;
      // In monitor.js, services is just the array of names/urls.
      // But getAllServices helper I added merges status.
      // service.status is 'healthy', 'critical', 'degraded', 'unknown'
      
      const isHealthy = service.status === 'healthy';
      metrics.serviceHealth.set(
        { service: service.name, environment: service.env || 'production' },
        isHealthy ? 1 : 0
      );
  }
}

// Collect incident metrics
async function collectIncidentMetrics() {
  // Since we don't have a dedicated "Incidents" database, we'll infer active incidents
  // from the current service status.
  const services = getAllServices();
  
  // This logic assumes we want to track incidents as active when service is not healthy.
  // We set 0 for all severities initially for each service to clear old states if labels persist.
  // Note: Gauges persist their values for label sets unless explicitly changed.
  
  services.forEach(service => {
      // Reset all potential severity states for this service
      ['critical', 'warning', 'alert'].forEach(severity => {
           metrics.activeIncidents.set({ severity, service: service.name }, 0);
      });
      
      if (service.status !== 'healthy' && service.status !== 'unknown') {
          let severity = 'warning';
          if (service.status === 'critical') severity = 'critical';
          
          metrics.activeIncidents.set({ severity, service: service.name }, 1);
      }
  });
}

// Record a new incident
function recordIncident(incident) {
  metrics.incidentsTotal.inc({
    severity: incident.severity,
    service: incident.service,
    type: incident.type
  });
}

// Record healing action
function recordHealingAction(action) {
  metrics.healingActionsTotal.inc({
    service: action.service,
    action: action.type,
    outcome: action.success ? 'success' : 'failure'
  });
}

// Start periodic collection
function startCollectors(intervalMs = 15000) {
  let isCollecting = false;
  setInterval(async () => {
    if (isCollecting) return; // Prevent overlaps
    isCollecting = true;
    try {
      await collectServiceMetrics();
      await collectIncidentMetrics();
    } catch (error) {
      console.error('Error in metrics collection:', error.message);
    } finally {
      isCollecting = false;
    }
  }, intervalMs);
}

module.exports = { 
  collectServiceMetrics, 
  collectIncidentMetrics,
  recordIncident,
  recordHealingAction,
  startCollectors 
};
