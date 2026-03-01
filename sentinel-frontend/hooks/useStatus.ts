"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useWebSocketContext } from "@/lib/WebSocketContext";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useStatus() {
    const [status, setStatus] = useState<{ services: Record<string, unknown> }>({ services: {} });
    const [activity, setActivity] = useState<Record<string, unknown>[]>([]);
    const [insights, setInsights] = useState<Record<string, unknown>[]>([]);
    const { lastMessage } = useWebSocketContext();

    // Initial fetch for cold start
    const fetchData = useCallback(async () => {
        try {
            const [statusRes, activityRes, insightsRes] = await Promise.all([
                axios.get(`${API_BASE}/api/status`),
                axios.get(`${API_BASE}/api/activity`),
                axios.get(`${API_BASE}/api/insights`)
            ]);

            setStatus(statusRes.data);
            setActivity(activityRes.data.activity);
            setInsights(insightsRes.data.insights);
        } catch (error) {
            console.error("Error fetching system status:", error);
        }
    }, []);

    // Initial data load only — no polling
    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    // React to WebSocket messages for real-time updates
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'METRICS') {
            // Full status update from backend
            setStatus(prev => {
                const next = { ...prev, services: lastMessage.data.services ?? prev.services, lastUpdated: new Date() };
                return next;
            });
        } else if (lastMessage.type === 'SERVICE_UPDATE') {
            // Single service update
            setStatus(prev => ({
                ...prev,
                services: {
                    ...prev.services,
                    [lastMessage.data.name]: {
                        status: lastMessage.data.status,
                        code: lastMessage.data.code,
                        lastUpdated: lastMessage.data.lastUpdated,
                    }
                },
            }));
        } else if (lastMessage.type === 'ACTIVITY_LOG') {
            // Real-time activity log entry
            setActivity(prev => {
                const entry = lastMessage.data as unknown as Record<string, unknown>;
                if (prev.some(a => a.id === entry.id)) return prev;
                const next = [entry, ...prev];
                return next.length > 100 ? next.slice(0, 100) : next;
            });
        } else if (lastMessage.type === 'INCIDENT_NEW') {
            // Real-time new insight/incident
            setInsights(prev => {
                const insight = lastMessage.data as Record<string, unknown>;
                if (prev.some(i => i.id === insight.id)) return prev;
                const next = [insight, ...prev];
                return next.length > 50 ? next.slice(0, 50) : next;
            });
        }
    }, [lastMessage]);

    return { status, activity, insights };
}
