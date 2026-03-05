const axios = require('axios');
const EventEmitter = require('events');

// ΓöÇΓöÇΓöÇ Sliding Window Metrics Store ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
class MetricsWindow {
    constructor(maxSize = 20) {
        this.maxSize = maxSize;
        this.samples = [];
    }

    push(sample) {
        this.samples.push({
            cpu: sample.cpu,
            mem: sample.mem,
            timestamp: Date.now()
        });
        if (this.samples.length > this.maxSize) {
            this.samples.shift();
        }
    }

    getAverage(key) {
        if (this.samples.length === 0) return 0;
        const sum = this.samples.reduce((acc, s) => acc + (s[key] || 0), 0);
        return sum / this.samples.length;
    }

    getTrend(key) {
        if (this.samples.length < 3) return 'stable';
        const recent = this.samples.slice(-5);
        const older = this.samples.slice(0, Math.max(1, this.samples.length - 5));

        const recentAvg = recent.reduce((a, s) => a + (s[key] || 0), 0) / recent.length;
        const olderAvg = older.reduce((a, s) => a + (s[key] || 0), 0) / older.length;

        const delta = recentAvg - olderAvg;
        if (delta > 5) return 'rising';
        if (delta < -5) return 'falling';
        return 'stable';
    }

    getVelocity(key) {
        if (this.samples.length < 2) return 0;
        const first = this.samples[0];
        const last = this.samples[this.samples.length - 1];
        const timeDelta = (last.timestamp - first.timestamp) / 1000; // seconds
        if (timeDelta === 0) return 0;
        return ((last[key] || 0) - (first[key] || 0)) / timeDelta;
    }

    isFull() {
        return this.samples.length >= this.maxSize;
    }

    size() {
        return this.samples.length;
    }

    toSummary() {
        return {
            samples: this.samples.length,
            cpuAvg: parseFloat(this.getAverage('cpu').toFixed(2)),
            memAvg: parseFloat(this.getAverage('mem').toFixed(2)),
            cpuTrend: this.getTrend('cpu'),
            memTrend: this.getTrend('mem'),
            cpuVelocity: parseFloat(this.getVelocity('cpu').toFixed(4)),
            memVelocity: parseFloat(this.getVelocity('mem').toFixed(4))
        };
    }
}

// ΓöÇΓöÇΓöÇ Scaling Predictor ΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇΓöÇ
class ScalingPredictor extends EventEmitter {
    constructor() {
        super();
        this.windows = new Map();       // containerId -> MetricsWindow
        this.predictions = new Map();   // containerId -> prediction object
        this.containerNames = new Map(); // containerId -> name
        this.evaluationInterval = null;
        this.collectionInterval = null;
        this.wsBroadcaster = null;
        this.monitor = null;

        // Configuration
        this.PREDICTION_THRESHOLD = 0.75;
        this.EVAL_INTERVAL_MS = 30000;    // Evaluate every 30s
        this.COLLECT_INTERVAL_MS = 5000;  // Collect metrics every 5s
    }

    init(monitor, wsBroadcaster) {
        this.monitor = monitor;
        this.wsBroadcaster = wsBroadcaster;

        console.log('≡ƒö« Initializing Predictive Scaling Engine...');

        // Collect metrics from the monitor on a regular interval
        this.collectionInterval = setInterval(() => this.collectMetrics(), this.COLLECT_INTERVAL_MS);

        // Evaluate predictions periodically
        this.evaluationInterval = setInterval(() => this.evaluateAll(), this.EVAL_INTERVAL_MS);

        // First collection after short delay
        setTimeout(() => this.collectMetrics(), 2000);
    }

    collectMetrics() {
        if (!this.monitor) return;

        // Get all currently monitored containers
        const metricsMap = this.monitor.metrics;
        if (!metricsMap || metricsMap.size === 0) return;

        // Prune state for containers that are no longer monitored
        const activeIds = new Set(metricsMap.keys());
        for (const containerId of this.windows.keys()) {
            if (!activeIds.has(containerId)) {
                this.windows.delete(containerId);
                this.predictions.delete(containerId);
                this.containerNames.delete(containerId);
            }
        }

        for (const [containerId, metrics] of metricsMap.entries()) {
            if (!this.windows.has(containerId)) {
                this.windows.set(containerId, new MetricsWindow(20));
            }

            const cpuVal = parseFloat(metrics.cpu) || 0;
            const memVal = parseFloat(metrics.memory?.percent) || 0;

            this.windows.get(containerId).push({ cpu: cpuVal, mem: memVal });
        }
    }

    async evaluateAll() {
        if (this.isEvaluating || this.windows.size === 0) return;
        this.isEvaluating = true;

        try {
            const results = [];

            for (const [containerId, window] of this.windows.entries()) {
                if (window.size() < 3) continue; // Need at least 3 samples

                try {
                    const prediction = await this.evaluateContainer(containerId, window);
                    if (prediction) {
                        this.predictions.set(containerId, prediction);
                        results.push(prediction);

                        // Emit event if above threshold
                        if (prediction.failureProbability >= this.PREDICTION_THRESHOLD) {
                            this.emit('scale-recommendation', prediction);
                            console.log(`≡ƒö« SCALE ALERT: ${prediction.containerName || containerId.substring(0, 12)} ΓåÆ ${Math.round(prediction.failureProbability * 100)}% failure risk`);
                        }
                    }
                } catch (err) {
                    console.error(`Prediction error for ${containerId.substring(0, 12)}:`, err.message);
                }
            }

            // Broadcast all predictions to frontend
            if (this.wsBroadcaster && results.length > 0) {
                this.wsBroadcaster.broadcast('SCALE_PREDICTION', {
                    predictions: results,
                    evaluatedAt: new Date().toISOString()
                });
            }
        } finally {
            this.isEvaluating = false;
        }
    }

    async evaluateContainer(containerId, window) {
        const summary = window.toSummary();
        const containerName = this.containerNames.get(containerId) || containerId.substring(0, 12);

        // Rule-based scoring (fast, no API call needed)
        let ruleScore = 0;
        let reasons = [];

        // CPU analysis
        if (summary.cpuAvg > 80) {
            ruleScore += 0.4;
            reasons.push(`CPU averaging ${summary.cpuAvg}% (critical)`);
        } else if (summary.cpuAvg > 60) {
            ruleScore += 0.2;
            reasons.push(`CPU averaging ${summary.cpuAvg}% (elevated)`);
        }

        if (summary.cpuTrend === 'rising') {
            ruleScore += 0.2;
            reasons.push('CPU trend is rising');
        }

        if (summary.cpuVelocity > 0.5) {
            ruleScore += 0.15;
            reasons.push(`CPU velocity: +${summary.cpuVelocity}%/s`);
        }

        // Memory analysis
        if (summary.memAvg > 85) {
            ruleScore += 0.35;
            reasons.push(`Memory averaging ${summary.memAvg}% (critical)`);
        } else if (summary.memAvg > 70) {
            ruleScore += 0.15;
            reasons.push(`Memory averaging ${summary.memAvg}% (elevated)`);
        }

        if (summary.memTrend === 'rising') {
            ruleScore += 0.15;
            reasons.push('Memory trend is rising');
        }

        // Cap at 1.0
        const failureProbability = Math.min(ruleScore, 1.0);

        // Attempt AI enrichment for borderline cases (0.4 - 0.9 range)
        let aiReasoning = null;
        if (failureProbability >= 0.4 && failureProbability < 0.9 && process.env.GROQ_API_KEY) {
            try {
                aiReasoning = await this.getAIInsight(containerName, summary);
            } catch {
                // AI is optional enrichment, continue without it
            }
        }

        return {
            containerId,
            containerName,
            failureProbability: parseFloat(failureProbability.toFixed(3)),
            trend: summary.cpuTrend === 'rising' || summary.memTrend === 'rising' ? 'rising' :
                summary.cpuTrend === 'falling' && summary.memTrend === 'falling' ? 'falling' : 'stable',
            reasons,
            aiReasoning,
            metrics: summary,
            recommendation: failureProbability >= this.PREDICTION_THRESHOLD ? 'scale-out' : 'monitor',
            evaluatedAt: new Date().toISOString()
        };
    }

    async getAIInsight(containerName, summary) {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) return null;

        const prompt = `Container "${containerName}" metrics: CPU avg=${summary.cpuAvg}%, trend=${summary.cpuTrend}, velocity=${summary.cpuVelocity}%/s. Memory avg=${summary.memAvg}%, trend=${summary.memTrend}. In 1-2 sentences, should we pre-emptively scale this container? Respond with a brief assessment only.`;

        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [
                { role: 'system', content: 'You are a DevOps infrastructure analyst. Provide brief, actionable scaling assessments.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 80
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            timeout: 5000
        });

        return response.data?.choices?.[0]?.message?.content || null;
    }

    setContainerName(containerId, name) {
        this.containerNames.set(containerId, name);
    }

    getPredictions() {
        return Array.from(this.predictions.values());
    }

    getPrediction(containerId) {
        return this.predictions.get(containerId) || null;
    }

    stop() {
        if (this.evaluationInterval) clearInterval(this.evaluationInterval);
        if (this.collectionInterval) clearInterval(this.collectionInterval);
        console.log('≡ƒö« Scaling Predictor stopped.');
    }
}

module.exports = new ScalingPredictor();
