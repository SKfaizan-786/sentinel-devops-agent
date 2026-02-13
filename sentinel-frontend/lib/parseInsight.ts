
import { Incident } from "./mockData";

export interface InsightPayload {
    id?: string | number;
    analysis?: string;
    summary?: string;
    timestamp?: string;
    [key: string]: unknown;
}

interface AiAnalysisData {
    summary: string;
    choices?: { message: { content: string } }[];
}

/**
 * Parses a raw insight payload into a structured Incident object.
 */
export function parseInsight(insight: InsightPayload): Incident {
    // Parse AI analysis
    let aiData: AiAnalysisData = { summary: "" };
    const rawAnalysis = insight.analysis || insight.summary || "";

    try {
        if (typeof rawAnalysis === 'string' && rawAnalysis.trim().startsWith('{')) {
            const parsed = JSON.parse(rawAnalysis);
            aiData = parsed;
            if (parsed.choices?.[0]?.message?.content) {
                aiData.summary = parsed.choices[0].message.content;
            }
        } else {
            aiData = { summary: String(rawAnalysis) };
        }
    } catch {
        aiData = { summary: String(rawAnalysis) };
    }

    const summaryUpper = (aiData.summary || "").toUpperCase();
    const isCritical = summaryUpper.includes("CRITICAL") || summaryUpper.includes("FATAL");
    const isDegraded = summaryUpper.includes("DEGRADED") || summaryUpper.includes("ERROR") || summaryUpper.includes("DOWN");

    let status: "resolved" | "failed" = "resolved";
    let title = "System Normal";
    let severity: "info" | "warning" | "critical" = "info";

    if (isCritical) {
        status = "failed";
        title = "System Critical";
        severity = "critical";
    } else if (isDegraded) {
        status = "failed";
        title = "System Degraded";
        severity = "warning";
    }

    // Construct title intelligently if possible
    if (aiData.summary) {
        const cleanSummary = aiData.summary.replace(/[*#]/g, '').trim();
        title = cleanSummary.slice(0, 80) + (cleanSummary.length > 80 ? "..." : "");
    }

    return {
        id: insight.id?.toString() || Date.now().toString(),
        title: title,
        serviceId: "system",
        status: status,
        severity: severity,
        timestamp: insight.timestamp || new Date().toISOString(),
        duration: status === "failed" ? "Action Required" : "Normal",
        rootCause: status === "failed" ? "Service Failure Detected" : "Routine Check",
        agentAction: "Monitoring",
        agentPredictionConfidence: 0,
        timeline: [],
        reasoning: aiData.summary || String(rawAnalysis) || "No analysis available"
    };
}
