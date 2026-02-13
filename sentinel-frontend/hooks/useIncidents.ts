"use client";

import { useEffect, useState, useCallback } from "react";
import { Incident } from "@/lib/mockData";
import { useWebSocketContext } from "../lib/WebSocketContext";

interface AiAnalysisData {
    summary: string;
    choices?: { message: { content: string } }[];
}

interface InsightPayload {
    id?: string | number;
    analysis?: string;
    summary?: string;
    timestamp?: string;
    [key: string]: unknown;
}

export function useIncidents() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
    const { isConnected, lastMessage } = useWebSocketContext();

    const processInsight = useCallback((insight: InsightPayload) => {
        if (!insight) return;

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

        const incident: Incident = {
            id: insight.id?.toString() || Date.now().toString(),
            title: title,
            serviceId: "system",
            status: status,
            severity: severity,
            timestamp: insight.timestamp || new Date().toISOString(),
            duration: status === "failed" ? "Action Required" : "Normal",
            rootCause: status === "failed" ? "Service Failure Detected" : "Routine Check",
            agentAction: "Monitoring",
            agentPredictionConfidence: 99,
            timeline: [],
            reasoning: aiData.summary || String(rawAnalysis) || "No analysis available"
        };

        setIncidents(prev => {
            // Prevent duplicates
            if (prev.some(i => i.id === incident.id)) return prev;
            return [incident, ...prev];
        });

        // Auto-open panel only if critical/degraded
        if (status === 'failed') {
            setActiveIncidentId(incident.id);
        }
    }, []);

    // Handle WebSocket Messages
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'INCIDENT_NEW') {
            processInsight(lastMessage.data);
        } else if (lastMessage.type === 'INIT' && lastMessage.data.aiAnalysis) {
            // Optional: Handle INIT data if structural match found
        }
    }, [lastMessage, processInsight]);

    // Initial Fetch
    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        fetch(`${apiUrl}/insights`)
            .then(res => res.json())
            .then(data => {
                if (data.insights && Array.isArray(data.insights)) {
                    data.insights.forEach((insight: InsightPayload) => {
                        processInsight(insight);
                    });
                }
            })
            .catch(e => console.error("Failed to fetch incidents:", e));
    }, [processInsight]);

    return {
        incidents,
        activeIncidentId,
        setActiveIncidentId,
        connectionStatus: isConnected ? "connected" : "disconnected",
    };
}
