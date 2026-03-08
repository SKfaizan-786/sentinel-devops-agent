const crypto = require('crypto');

function generateFingerprint(incident) {
  const tokens = [];

  // Hash container names for privacy
  if (incident.containerName) {
      const normalized = incident.containerName.replace(/[-_]\d+$/, '').toLowerCase();
      const hash = crypto.createHash('sha256').update(normalized).digest('hex').slice(0, 12);
      tokens.push(`container:${hash}`);
  }

  const metrics = incident.metrics || {};
  if (metrics.cpuPercent > 90) tokens.push('high_cpu');
  if (metrics.memPercent > 85) tokens.push('high_memory');
  if (metrics.restartCount > 2) tokens.push('repeated_restarts');

  const logText = (incident.logs || '').toLowerCase();
  
  if (logText.includes('out of memory') || logText.includes('oom') || logText.includes('heap limit')) tokens.push('oom');
  if (logText.includes('connection refused') || logText.includes('econnrefused')) tokens.push('conn_refused');
  if (logText.includes('timeout') || logText.includes('etimedout')) tokens.push('timeout');
  if (logText.includes('error') || logText.includes('exception') || logText.includes('fail')) tokens.push('error');
  if (logText.includes('crash') || logText.includes('sigkill')) tokens.push('crash');

  const eventTime = incident.timestamp ? new Date(incident.timestamp) : new Date();
  const hour = Number.isNaN(eventTime.getTime()) ? new Date().getHours() : eventTime.getHours();
  tokens.push(hour < 6 ? 'night' : hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening');

  return tokens;
}

function similarity(a, b) {
  if (!a || !b) return 0;
  const setA = new Set(a), setB = new Set(b);
  const intersection = [...setA].filter(t => setB.has(t)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : intersection / union;
}

module.exports = { generateFingerprint, similarity };
