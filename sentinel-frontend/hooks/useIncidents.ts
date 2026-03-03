"use client";

import { useEffect, useState } from "react";
import { Incident } from "@/lib/mockData";
import { useWebSocketContext } from "../lib/WebSocketContext";
import { parseInsight, InsightPayload } from "@/lib/parseInsight";

export function useIncidents(options: { manual?: boolean } = {}) {
    const { manual } = options;
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
    const { isConnected, lastMessage } = useWebSocketContext();

    // Handle WebSocket Messages
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'INCIDENT_NEW') {
            const insight = lastMessage.data as InsightPayload;
            if (!insight) return;

            const incident = parseInsight(insight);

            setIncidents(prev => {
                // Prevent duplicates
                if (prev.some(i => i.id === incident.id)) return prev;
                return [incident, ...prev];
            });

            // Auto-open panel only if critical/degraded
            if (incident.status === 'failed') {
                setActiveIncidentId(incident.id);
            }
        }
    }, [lastMessage]);

    // Initial Fetch
    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        fetch(`${apiUrl}/insights`)
            .then(res => res.json())
            .then(data => {
                if (data.insights && Array.isArray(data.insights)) {
                    const newIncidents = data.insights.map((i: InsightPayload) => parseInsight(i));
                    setIncidents(prev => {
                        // Simple merge avoiding duplicates could be expensive for large lists, 
                        // but okay for small lengths.
                        // Or just set initial load if empty?
                        // Let's prepend unique ones.
                        const existingIds = new Set(prev.map(p => p.id));
                        const uniqueNew = newIncidents.filter((n: Incident) => !existingIds.has(n.id));
                        return [...uniqueNew, ...prev];
                    });
                }
            })
            .catch(e => console.error("Failed to fetch incidents:", e));
    }, []);

    return {
        incidents,
        activeIncidentId,
        setActiveIncidentId,
        connectionStatus: isConnected ? "connected" : "disconnected",
    };
}
