const pool = require('../db/config');
const axios = require('axios');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// Estimated cost per MB of memory per month (simplified cloud pricing model)
const COST_PER_MB_MONTH = 0.10; // $0.10 per MB/month — configurable

/**
 * Fetch rolling 7-day averages per container from metric snapshots.
 */
async function getRollingAverages() {
    const result = await pool.query(`
        SELECT
            container_id,
            container_name,
            ROUND(AVG(cpu_percent)::numeric, 2) AS avg_cpu,
            ROUND(AVG(memory_usage_bytes)::numeric / (1024*1024), 2) AS avg_memory_mb,
            ROUND(AVG(memory_limit_bytes)::numeric / (1024*1024), 2) AS avg_limit_mb,
            ROUND(AVG(memory_percent)::numeric, 2) AS avg_memory_percent,
            COUNT(*) AS sample_count
        FROM finops_metric_snapshots
        WHERE recorded_at > NOW() - INTERVAL '7 days'
        GROUP BY container_id, container_name
        HAVING COUNT(*) >= 3
        ORDER BY AVG(memory_percent) ASC
    `);
    return result.rows;
}

/**
 * Build a prompt for the LLM from utilization data.
 */
function buildPrompt(containers) {
    const lines = containers.map(c =>
        `- ${c.container_name} (ID: ${c.container_id.substring(0, 12)}): ` +
        `CPU avg=${c.avg_cpu}%, Memory avg=${c.avg_memory_mb}MB / limit=${c.avg_limit_mb}MB (${c.avg_memory_percent}% used), ` +
        `${c.sample_count} samples over 7 days`
    ).join('\n');

    return `You are a FinOps advisor for cloud infrastructure. Analyze the following 7-day average resource utilization for Docker containers and provide right-sizing recommendations.

Container Utilization Data:
${lines}

For each container that is over-provisioned (using less than 50% of allocated resources), provide a recommendation in the following JSON array format:
[
  {
    "container_id": "<full id>",
    "container_name": "<name>",
    "current_memory_limit_mb": <number>,
    "recommended_memory_limit_mb": <number>,
    "reasoning": "<brief explanation>"
  }
]

Rules:
- Recommend at most 20% headroom above actual average usage (recommended = avg_usage * 1.2, rounded up)
- Minimum recommended limit is 64MB
- Only include containers that would benefit from downsizing
- If no containers need changes, return an empty array []
- Return ONLY the JSON array, no other text`;
}

/**
 * Call Groq API to analyze utilization data.
 */
async function callGroqAnalysis(prompt) {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
        console.warn('⚠️ GROQ_API_KEY not set — generating mock recommendations');
        return null;
    }

    try {
        const response = await axios.post(GROQ_API_URL, {
            model: GROQ_MODEL,
            messages: [
                { role: 'system', content: 'You are a FinOps cost optimization advisor. Return only valid JSON.' },
                { role: 'user', content: prompt }
            ],
            temperature: 0.2,
            max_tokens: 1000
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        const content = response.data.choices?.[0]?.message?.content || '[]';
        // Extract JSON from potential markdown code blocks
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch (error) {
        console.error('❌ Groq API call failed:', error.message);
        return null;
    }
}

/**
 * Generate mock recommendations when GROQ_API_KEY is not available.
 */
function generateMockRecommendations(containers) {
    return containers
        .filter(c => parseFloat(c.avg_memory_percent) < 50)
        .slice(0, 3)
        .map(c => ({
            container_id: c.container_id,
            container_name: c.container_name,
            current_memory_limit_mb: parseFloat(c.avg_limit_mb),
            recommended_memory_limit_mb: Math.max(64, Math.ceil(parseFloat(c.avg_memory_mb) * 1.2)),
            reasoning: `Container uses only ${c.avg_memory_percent}% of allocated memory on average. ` +
                `Recommend reducing from ${c.avg_limit_mb}MB to ${Math.max(64, Math.ceil(parseFloat(c.avg_memory_mb) * 1.2))}MB.`
        }));
}

/**
 * Run full FinOps analysis: fetch averages, call AI, store recommendations.
 */
async function runAnalysis() {
    console.log('💰 Running FinOps analysis...');

    const containers = await getRollingAverages();
    if (containers.length === 0) {
        console.log('💰 No metric data available for analysis');
        return { recommendations: [], message: 'No metric data available. Metrics need time to accumulate.' };
    }

    const prompt = buildPrompt(containers);
    let recommendations = await callGroqAnalysis(prompt);

    // Fallback to mock if GROQ is unavailable
    if (recommendations === null) {
        recommendations = generateMockRecommendations(containers);
    }

    // Store recommendations in database
    for (const rec of recommendations) {
        const containerData = containers.find(c => c.container_id === rec.container_id);
        const currentCpuAvg = containerData ? parseFloat(containerData.avg_cpu) : 0;
        const currentMemAvg = containerData ? parseFloat(containerData.avg_memory_mb) : 0;
        const savingsMonthly = (rec.current_memory_limit_mb - rec.recommended_memory_limit_mb) * COST_PER_MB_MONTH;

        // Upsert: update if pending recommendation exists for same container, else insert
        await pool.query(`
            INSERT INTO finops_recommendations
                (container_id, container_name, current_cpu_avg, current_memory_avg_mb,
                 current_memory_limit_mb, recommended_memory_limit_mb, estimated_savings_monthly, reasoning, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
            ON CONFLICT (container_id) WHERE status = 'pending'
            DO UPDATE SET
                container_name = EXCLUDED.container_name,
                current_cpu_avg = EXCLUDED.current_cpu_avg,
                current_memory_avg_mb = EXCLUDED.current_memory_avg_mb,
                current_memory_limit_mb = EXCLUDED.current_memory_limit_mb,
                recommended_memory_limit_mb = EXCLUDED.recommended_memory_limit_mb,
                estimated_savings_monthly = EXCLUDED.estimated_savings_monthly,
                reasoning = EXCLUDED.reasoning,
                updated_at = NOW()
        `, [
            rec.container_id,
            rec.container_name,
            currentCpuAvg,
            currentMemAvg,
            rec.current_memory_limit_mb,
            rec.recommended_memory_limit_mb,
            savingsMonthly,
            rec.reasoning
        ]);
    }

    console.log(`💰 FinOps analysis complete: ${recommendations.length} recommendations generated`);
    return { recommendations, message: `Generated ${recommendations.length} recommendations` };
}

/**
 * Get the current summary for the FinOps dashboard.
 */
async function getSummary() {
    const recResult = await pool.query(`
        SELECT
            COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
            COUNT(*) FILTER (WHERE status = 'applied') AS applied_count,
            COALESCE(SUM(estimated_savings_monthly) FILTER (WHERE status = 'pending'), 0) AS potential_savings,
            COALESCE(SUM(estimated_savings_monthly) FILTER (WHERE status = 'applied'), 0) AS realized_savings
        FROM finops_recommendations
    `);

    const containerResult = await pool.query(`
        SELECT COUNT(DISTINCT container_id) AS monitored_containers
        FROM finops_metric_snapshots
        WHERE recorded_at > NOW() - INTERVAL '24 hours'
    `);

    const wasteResult = await pool.query(`
        SELECT
            ROUND(AVG(memory_percent)::numeric, 2) AS avg_utilization
        FROM finops_metric_snapshots
        WHERE recorded_at > NOW() - INTERVAL '24 hours'
    `);

    const row = recResult.rows[0] || {};
    const avgUtil = parseFloat(wasteResult.rows[0]?.avg_utilization) || 0;

    return {
        potentialSavingsMonthly: parseFloat(row.potential_savings) || 0,
        realizedSavingsMonthly: parseFloat(row.realized_savings) || 0,
        pendingRecommendations: parseInt(row.pending_count) || 0,
        appliedRecommendations: parseInt(row.applied_count) || 0,
        monitoredContainers: parseInt(containerResult.rows[0]?.monitored_containers) || 0,
        avgResourceUtilization: avgUtil,
        wastePercentage: Math.max(0, 100 - avgUtil)
    };
}

/**
 * Get heatmap data — per-container avg utilization over last 7 days.
 */
async function getHeatmapData() {
    const result = await pool.query(`
        SELECT
            container_id,
            container_name,
            ROUND(AVG(cpu_percent)::numeric, 2) AS avg_cpu,
            ROUND(AVG(memory_percent)::numeric, 2) AS avg_memory,
            ROUND(AVG(memory_usage_bytes)::numeric / (1024*1024), 2) AS avg_memory_mb,
            ROUND(AVG(memory_limit_bytes)::numeric / (1024*1024), 2) AS avg_limit_mb
        FROM finops_metric_snapshots
        WHERE recorded_at > NOW() - INTERVAL '7 days'
        GROUP BY container_id, container_name
        ORDER BY container_name
    `);
    return result.rows;
}

module.exports = { runAnalysis, getSummary, getHeatmapData, getRollingAverages };
