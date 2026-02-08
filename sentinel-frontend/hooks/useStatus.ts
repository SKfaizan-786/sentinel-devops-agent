"use client";

import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export function useStatus() {
    const [status, setStatus] = useState<{ services: Record<string, string> }>({ services: {} });
    const [activity, setActivity] = useState<Record<string, unknown>[]>([]);
    const [insights, setInsights] = useState<Record<string, unknown>[]>([]);

    const fetchData = async () => {
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
    };

    useEffect(() => {
        // eslint-disable-next-line
        void fetchData(); // Async call, safe to ignore sync warning
        const interval = setInterval(fetchData, 2000); // 2s polling
        return () => clearInterval(interval);
    }, []);

    return { status, activity, insights };
}
