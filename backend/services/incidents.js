let activityLog = [];
let aiLogs = [];
let nextLogId = 1;

function logActivity(type, message) {
  const entry = {
    id: nextLogId++,
    timestamp: new Date().toISOString(),
    type,
    message
  };
  activityLog.unshift(entry);
  if (activityLog.length > 100) activityLog.pop(); // Keep last 100
  console.log(`[LOG] ${type}: ${message}`);
  return entry;
}

function getActivityLog() {
    return activityLog;
}

function getAiLogs() {
    return aiLogs;
}

function addAiLog(report) {
    const insight = {
        id: nextLogId++,
        timestamp: new Date().toISOString(),
        analysis: report,
        summary: report
    };
    aiLogs.unshift(insight);
    if (aiLogs.length > 50) aiLogs.pop();
    return insight;
}

// In the original code, incidents were not explicitly tracked as "Active" vs "Resolved" in a separate list,
// but rather inferred from aiLogs or systemStatus.
// For metrics, we need active incidents. Let's assume aiLogs represent incidents.
// Or effectively, look at systemStatus which we will move to monitor.js
function getActiveIncidents() {
    // This is a placeholder. Real implementation might need to correlate with current system status
    // or we might need to enhance how we track incidents.
    // For now, let's return the recent AI logs as "active" if they are recent enough?
    // Or maybe we just return the count of non-healthy services from monitor?
    return aiLogs;
}

module.exports = {
    logActivity,
    getActivityLog,
    getAiLogs,
    addAiLog,
    getActiveIncidents
};
