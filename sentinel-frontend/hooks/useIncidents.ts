"use client";

import { useEffect, useState, useRef } from "react";
import { Incident } from "@/lib/mockData";

export function useIncidents() {
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchIncidents = async () => {
        try {
            // Fetch AI insights from Kestra (this contains the actual AI logs)
            const res = await fetch("http://localhost:4000/api/insights");
            if (!res.ok) return;
            const data = await res.json();

            if (data.insights && Array.isArray(data.insights) && data.insights.length > 0) {
                const latestInsight = data.insights[0];

                // Parse AI analysis
                let aiData: any = {};
                let rawAnalysis = latestInsight.analysis || latestInsight.summary || "";

                try {
                    if (rawAnalysis.trim().startsWith('{')) {
                        aiData = JSON.parse(rawAnalysis);
                        if (aiData.choices?.[0]?.message?.content) {
                            aiData.summary = aiData.choices[0].message.content;
                        }
                    } else {
                        aiData = { summary: rawAnalysis };
                    }
                } catch (e) {
                    aiData = { summary: rawAnalysis };
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
                } else {
                    // Healthy state
                    status = "resolved";
                    title = "System Healthy";
                    severity = "info";
                }

                const incident: Incident = {
                    id: latestInsight.id?.toString() || "latest",
                    title: title,
                    serviceId: "system",
                    status: status,
                    severity: severity,
                    timestamp: latestInsight.timestamp || new Date().toISOString(),
                    duration: status === "failed" ? "Action Required" : "Normal",
                    rootCause: status === "failed" ? "Service Failure Detected" : "Routine Check",
                    agentAction: "Monitoring",
                    agentPredictionConfidence: 99,
                    timeline: [],
                    reasoning: aiData.summary || rawAnalysis || "No analysis available"
                };

                // Always show the latest incident (even if healthy)
                setIncidents([incident]);

                // Auto-open panel only if critical/degraded
                if (!activeIncidentId && status === 'failed') {
                    setActiveIncidentId(incident.id);
                }
            } else {
                // No insights yet
                setIncidents([]);
            }

        } catch (e) {
            console.error("Failed to fetch incidents:", e);
        }
    };

    useEffect(() => {
        fetchIncidents();
        intervalRef.current = setInterval(fetchIncidents, 3000); // Poll every 3s
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return {
        incidents,
        activeIncidentId,
        setActiveIncidentId,
        connectionStatus: "connected",
    };
}
