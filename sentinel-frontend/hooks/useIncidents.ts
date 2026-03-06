"use client";

import { useEffect, useState } from "react";
import { Incident } from "@/lib/mockData";
import { useWebSocketMessage, useWebSocketConnection } from "@/lib/WebSocketContext";
import { parseInsight, InsightPayload } from "@/lib/parseInsight";

export function useIncidents(options: { manual?: boolean } = {}) {
    const { manual } = options;
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [activeIncidentId, setActiveIncidentId] = useState<string | null>(null);
    const lastMessage = useWebSocketMessage();
    const { isConnected } = useWebSocketConnection();

    // Handle WebSocket Messages
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === "INCIDENT_NEW") {
            const newIncident = parseInsight(lastMessage.data as InsightPayload);
            setIncidents((prev) => {
                if (prev.some(i => i.id === newIncident.id)) return prev;
                return [newIncident, ...prev].slice(0, 50);
            });
        }
    }, [lastMessage]);

<<<<<<< HEAD
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
=======
    // Initial fetch fallback
    useEffect(() => {
        if (manual) return;

        const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
        fetch(`${API_BASE}/api/insights`)
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setIncidents(data.map(parseInsight));
                }
            })
            .catch(err => console.error("Failed to fetch incidents:", err));
    }, [manual]);
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963

    return { incidents, activeIncidentId, setActiveIncidentId, isConnected };
}
