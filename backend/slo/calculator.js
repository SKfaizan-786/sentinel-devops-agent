/**
 * SLO/Error Budget Calculator
 * 
 * Core math for calculating error budgets based on SLO definitions
 * and incident/downtime data.
 */

const MINUTES_PER_WINDOW = {
  '1day': 24 * 60,           // 1,440
  '7days': 7 * 24 * 60,      // 10,080
  '1month': 30 * 24 * 60,    // 43,200
};

/**
 * Calculate the error budget for a given SLO definition and set of incidents.
 * 
 * @param {Object} sloDefinition - The SLO configuration
 * @param {number} sloDefinition.targetAvailability - Target availability percentage (e.g. 99.9)
 * @param {string} sloDefinition.trackingWindow - Window size: '1day', '7days', '1month'
 * @param {boolean} [sloDefinition.includeScheduledMaintenance] - Whether to include scheduled maintenance
 * @param {Array} incidents - Array of incident objects with resolvedAt and mttrSeconds
 * @returns {Object} Error budget breakdown
 */
function calculateErrorBudget(sloDefinition, incidents = []) {
  const { targetAvailability, trackingWindow } = sloDefinition;
  const windowMinutes = MINUTES_PER_WINDOW[trackingWindow];

  if (!windowMinutes) {
    throw new Error(`Invalid tracking window: ${trackingWindow}. Must be one of: ${Object.keys(MINUTES_PER_WINDOW).join(', ')}`);
  }

  // Allowed downtime in minutes based on the SLO target
  const allowedDowntimeMinutes = windowMinutes * (1 - targetAvailability / 100);

  // Calculate current window boundaries
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const windowStart = now - windowMs;

  // Filter incidents within the current tracking window
  const relevantIncidents = incidents.filter(i => {
    const resolvedAt = i.resolvedAt || i.createdAt || 0;
    return resolvedAt >= windowStart;
  });

  // Sum up total downtime from incidents
  let totalDowntimeMinutes = 0;
  for (const incident of relevantIncidents) {
    totalDowntimeMinutes += (incident.downtimeMinutes || (incident.mttrSeconds || 0) / 60);
  }

  // Calculate remaining budget
  const remainingMinutes = Math.max(0, allowedDowntimeMinutes - totalDowntimeMinutes);
  const budgetPercent = allowedDowntimeMinutes > 0
    ? (remainingMinutes / allowedDowntimeMinutes) * 100
    : 100;

  // Calculate current availability
  const currentAvailability = windowMinutes > 0
    ? ((windowMinutes - totalDowntimeMinutes) / windowMinutes) * 100
    : 100;

  // Calculate burndown rate (budget consumed per day)
  const elapsedMs = now - windowStart;
  const elapsedDays = elapsedMs / (24 * 60 * 60 * 1000);
  const burndownRatePerDay = elapsedDays > 0
    ? (totalDowntimeMinutes / allowedDowntimeMinutes * 100) / elapsedDays
    : 0;

  // Project when error budget will be exhausted
  let projectedExhaustionDate = null;
  if (burndownRatePerDay > 0 && budgetPercent > 0) {
    const daysUntilExhaustion = budgetPercent / burndownRatePerDay;
    projectedExhaustionDate = new Date(now + daysUntilExhaustion * 24 * 60 * 60 * 1000).toISOString();
  }

  // Determine status
  let status = 'healthy';
  if (budgetPercent <= 0) {
    status = 'exhausted';
  } else if (budgetPercent <= 25) {
    status = 'critical';
  } else if (budgetPercent <= 50) {
    status = 'warning';
  }

  return {
    targetAvailability,
    currentAvailability: round(currentAvailability, 3),
    trackingWindow,
    windowMinutes,
    allowedDowntimeMinutes: round(allowedDowntimeMinutes, 2),
    usedDowntimeMinutes: round(totalDowntimeMinutes, 2),
    remainingMinutes: round(remainingMinutes, 2),
    budgetPercent: round(budgetPercent, 1),
    burndownRatePerDay: round(burndownRatePerDay, 2),
    projectedExhaustionDate,
    incidentCount: relevantIncidents.length,
    status,
  };
}

/**
 * Generate burndown chart data points for the tracking window.
 * Returns an array of { timestamp, budgetPercent } objects.
 */
function generateBurndownData(sloDefinition, incidents = [], points = 30) {
  const { trackingWindow } = sloDefinition;
  const windowMinutes = MINUTES_PER_WINDOW[trackingWindow];
  const windowMs = windowMinutes * 60 * 1000;
  const now = Date.now();
  const windowStart = now - windowMs;
  const allowedDowntimeMinutes = windowMinutes * (1 - sloDefinition.targetAvailability / 100);

  const sortedIncidents = incidents
    .filter(i => (i.resolvedAt || i.createdAt || 0) >= windowStart)
    .sort((a, b) => (a.resolvedAt || a.createdAt || 0) - (b.resolvedAt || b.createdAt || 0));

  const data = [];
  const interval = windowMs / points;

  for (let i = 0; i <= points; i++) {
    const timestamp = windowStart + (interval * i);
    let cumulativeDowntime = 0;

    for (const incident of sortedIncidents) {
      const incidentTime = incident.resolvedAt || incident.createdAt || 0;
      if (incidentTime <= timestamp) {
        cumulativeDowntime += (incident.downtimeMinutes || (incident.mttrSeconds || 0) / 60);
      }
    }

    const remaining = Math.max(0, allowedDowntimeMinutes - cumulativeDowntime);
    const budgetPct = allowedDowntimeMinutes > 0
      ? (remaining / allowedDowntimeMinutes) * 100
      : 100;

    data.push({
      timestamp: new Date(timestamp).toISOString(),
      budgetPercent: round(budgetPct, 1),
      usedMinutes: round(cumulativeDowntime, 2),
    });
  }

  return data;
}

function round(value, decimals) {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

module.exports = { calculateErrorBudget, generateBurndownData, MINUTES_PER_WINDOW };
