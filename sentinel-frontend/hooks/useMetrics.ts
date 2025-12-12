"use client";

import { useEffect, useState, useRef } from "react";

export type TimeSeriesPoint = {
    timestamp: string;
    responseTime: number;
    errorRate: number;
    cpu: number;
    value?: number; // derived or legacy
    [key: string]: any;
};

export type ServiceMetrics = {
    id: string;
    name: string;
    currentResponseTime: number;
    currentErrorRate: number;
    currentCpu: number;
    history: TimeSeriesPoint[];
};

export function useMetrics(timeRange: "1h" | "6h" | "24h" = "1h") {
    // Helper for initial history
    const initialHistory = Array(30).fill(0).map((_, i) => ({
        timestamp: new Date(Date.now() - (30 - i) * 2000).toLocaleTimeString(),
        responseTime: 20 + Math.random() * 10,
        cpu: 10 + Math.random() * 10,
        errorRate: 0
    }));

    const [metrics, setMetrics] = useState<Record<string, ServiceMetrics>>({
        "auth-service": { id: "auth-service", name: "Auth Service", currentResponseTime: 45, currentErrorRate: 0, currentCpu: 32, history: initialHistory },
        "payment-service": { id: "payment-service", name: "Payment Service", currentResponseTime: 85, currentErrorRate: 0, currentCpu: 22, history: initialHistory },
        "notification-service": { id: "notification-service", name: "Notification Service", currentResponseTime: 120, currentErrorRate: 0, currentCpu: 48, history: initialHistory },
        "api-gateway": { id: "api-gateway", name: "API Gateway", currentResponseTime: 15, currentErrorRate: 0, currentCpu: 12, history: initialHistory },
    });

    const [status, setStatus] = useState<string>("connecting");
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchMetrics = async () => {
        try {
            const res = await fetch("http://localhost:4000/api/status");
            if (!res.ok) throw new Error("Failed to fetch");
            const data = await res.json();

            setStatus("connected");
            const timestamp = new Date().toLocaleTimeString();

            setMetrics(prev => {
                const next = { ...prev };

                // Map backend services to frontend
                const serviceMap: any = {
                    "auth-service": data.services?.auth,
                    "payment-service": data.services?.payment,
                    "notification-service": data.services?.notification
                };

                Object.keys(next).forEach((key, index) => {
                    const backendData = serviceMap[key];
                    // Create base wave for visual liveliness (Sine wave + Noise)
                    const time = Date.now() / 2000;
                    const wave = Math.sin(time + index) * 10; // Phase shift by index

                    let responseTime = 0;
                    let errorRate = 0;
                    let cpu = 0;

                    // Base values per service type
                    if (key === "api-gateway") {
                        responseTime = 25 + wave;
                        cpu = 15 + Math.random() * 5;
                    } else if (key === "notification-service") {
                        responseTime = 120 + wave + Math.random() * 10;
                        cpu = 45 + Math.random() * 5;
                    } else {
                        responseTime = 45 + wave + Math.random() * 10; // Default
                        cpu = 25 + Math.random() * 5;
                    }

                    // If real backend data says it's down (code != 200)
                    if (backendData && backendData.code !== 200) {
                        errorRate = 1.0; // 100% error rate
                        responseTime = 0;
                        cpu = 0;
                    } else if (backendData) {
                        // Healthy: Add random jitter to the wave
                        responseTime += Math.random() * 5;
                    }

                    // Round values for UI cleanliness
                    responseTime = Math.round(responseTime);
                    cpu = Math.round(cpu);

                    // Update current values
                    next[key] = {
                        ...next[key],
                        currentResponseTime: responseTime,
                        currentErrorRate: errorRate,
                        currentCpu: cpu,
                        history: [
                            ...next[key].history,
                            { timestamp, responseTime, cpu, errorRate }
                        ].slice(-30) // Keep last 30 points
                    };
                });
                return next;
            });

        } catch (error) {
            console.error("Error fetching metrics:", error);
            setStatus("error");
        }
    };

    useEffect(() => {
        fetchMetrics(); // Initial fetch
        intervalRef.current = setInterval(fetchMetrics, 2000); // Poll every 2s to match Kestra's fast pace via flow

        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, []);

    return { metrics, status };
}
