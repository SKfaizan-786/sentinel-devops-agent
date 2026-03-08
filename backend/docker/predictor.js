const store = require('../db/metrics-store');

function linearRegression(values) {
  const n = values.length;
  if (n === 0) return 0;
  
  const x = values.map((_, i) => i);
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((a, xi, i) => a + xi * values[i], 0);
  const sumX2 = x.reduce((a, xi) => a + xi * xi, 0);
  
  const denominator = (n * sumX2 - sumX * sumX);
  if (denominator === 0) return 0;
  
  const slope = (n * sumXY - sumX * sumY) / denominator;
  return slope;
}

function predictContainer(containerId) {
  const window = store.getWindow(containerId, 60);
  if (window.length < 12) return null;

  const cpuValues = window.map(m => m.cpuPercent || 0);
  const memValues = window.map(m => m.memPercent || 0);
  // Safely handle restartCount which might be undefined or null
  const restarts = window.map(m => m.restartCount || 0);

  const cpuSlope = linearRegression(cpuValues);
  const memSlope = linearRegression(memValues);
  
  // Keep this aligned with monitor sampling cadence
  const sampleSeconds = Number(process.env.PREDICTION_SAMPLE_SECONDS || 5);
  const pointsPerMinute = 60 / sampleSeconds;
  const memSlopePerMinute = memSlope * pointsPerMinute;

  const currentRestarts = restarts[restarts.length - 1] || 0;
  const initialRestarts = restarts[0] || 0;
  const recentRestarts = currentRestarts - initialRestarts;

  let probability = 0;
  let reasons = [];

  const lastMem = memValues[memValues.length - 1];
  if (memSlopePerMinute > 0.5 && lastMem > 70) {
    probability = Math.min(probability + 0.4, 1.0);
    reasons.push(`Memory growing at ${memSlopePerMinute.toFixed(1)}%/min, currently ${lastMem.toFixed(0)}%`);
  }

  const lastCpu = cpuValues[cpuValues.length - 1];
  if (lastCpu > 90 && cpuSlope > 0) {
    probability = Math.min(probability + 0.35, 1.0);
    reasons.push(`CPU at ${lastCpu.toFixed(0)}% and rising`);
  }

  if (recentRestarts >= 3) {
    const minutes = Math.round((window.length * sampleSeconds) / 60);
    probability = Math.min(probability + 0.45, 1.0);
    reasons.push(`${recentRestarts} restarts in last ${minutes} minutes — crash loop detected`);
  }

  const secondsUntilFailure = probability > 0 ? Math.max(30, Math.floor(300 * (1 - probability))) : null;

  return {
    containerId,
    probability,
    estimatedFailureInSeconds: secondsUntilFailure,
    reason: reasons.join('; ') || 'No prediction signals',
    confidence: window.length >= 60 ? 'high' : window.length >= 30 ? 'medium' : 'low',
    timestamp: Date.now()
  };
}

module.exports = { predictContainer };
