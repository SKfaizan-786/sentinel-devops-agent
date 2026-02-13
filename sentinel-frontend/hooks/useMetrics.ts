"use client";

import { useEffect, useState } from "react";
import { useWebSocketContext } from "../lib/WebSocketContext";

export type TimeSeriesPoint = {
    timestamp: string;
    responseTime: number;
    errorRate: number;
    cpu: number;
    value?: number; // derived or legacy
    [key: string]: unknown;
};

export type ServiceMetrics = {
    id: string;
    name: string;
    currentResponseTime: number;
    currentErrorRate: number;
    currentCpu: number;
    history: TimeSeriesPoint[];
};

export interface RemoteStatusService {
    status: string;
    code: number;
    lastUpdated?: number | string;
    [key: string]: unknown;
}

export interface RemoteStatus {
    auth?: RemoteStatusService;
    payment?: RemoteStatusService;
    notification?: RemoteStatusService;
    [key: string]: RemoteStatusService | undefined;
}

export function useMetrics() {
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

    const { isConnected, lastMessage } = useWebSocketContext();
    const [remoteStatus, setRemoteStatus] = useState<RemoteStatus>({});

    // Listen for WebSocket messages from Context
    useEffect(() => {
        if (!lastMessage) return;

        if (lastMessage.type === 'METRICS' || lastMessage.type === 'INIT') {
            if (lastMessage.data.services) {
                setRemoteStatus(lastMessage.data.services as unknown as RemoteStatus);
            }
        } else if (lastMessage.type === 'SERVICE_UPDATE') {
            setRemoteStatus((prev) => ({
                ...prev,
                [lastMessage.data.name]: lastMessage.data as unknown as RemoteStatusService
            }));
        }
    }, [lastMessage]);

    // Update metrics loop (visuals + incorporating remote status)
    useEffect(() => {
        const updateMetrics = () => {
            const timestamp = new Date().toLocaleTimeString();

            setMetrics(prev => {
                const next = { ...prev };

                // Map backend services to frontend keys
                const serviceMap: Record<string, RemoteStatusService | undefined> = {
                    "auth-service": remoteStatus.auth,
                    "payment-service": remoteStatus.payment,
                    "notification-service": remoteStatus.notification
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
                    if (backendData && backendData.code !== 200 && backendData.code !== 0) {
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
        };

        const interval = setInterval(updateMetrics, 2000);
        return () => clearInterval(interval);
    }, [remoteStatus]);

    // Initial Fetch fallback
    useEffect(() => {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
        fetch(`${apiUrl}/status`)
            .then(res => res.json())
            .then(data => {
                if (data.services) setRemoteStatus(data.services);
            })
            .catch(e => console.error("Initial metrics fetch failed", e));
    }, []);

    return { metrics, status: isConnected ? "connected" : "disconnected" };
}
