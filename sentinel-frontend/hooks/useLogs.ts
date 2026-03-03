"use client";

import { useState, useEffect, useCallback } from "react";
import { useWebSocketContext } from "@/lib/WebSocketContext";

export type LogLevel = "info" | "warn" | "error" | "debug" | "success";

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    service: string;
    message: string;
}

function classifyLogLevel(type: string, message: string): LogLevel {
    if (type === 'alert' || message.includes("CRITICAL") || message.includes("down")) return "error";
    if (type === 'success' || message.includes("HEALTHY")) return "success";
    if (message.includes("DEGRADED")) return "warn";
    return "info";
}

export function useLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");
    const [search, setSearch] = useState("");
    const { lastMessage } = useWebSocketContext();

    // Initial fetch for cold start
    const fetchLogs = useCallback(async () => {
        try {
            const res = await fetch("http://localhost:4000/api/activity");
            if (!res.ok) throw new Error("Backend not available");
            const data = await res.json();

            if (data.activity) {
                const formattedLogs: LogEntry[] = data.activity.map((entry: { type: string; message: string; id: number; timestamp: string }) => ({
                    id: entry.id.toString(),
                    timestamp: entry.timestamp,
                    level: classifyLogLevel(entry.type, entry.message),
                    service: "sentinel-agent",
                    message: entry.message
                }));
                setLogs(formattedLogs);
            }
        } catch (e) {
            // Fallback to mock data if backend is not available
            const mockLogs: LogEntry[] = [
                {
                    id: "1",
                    timestamp: new Date().toISOString(),
                    level: "error",
                    service: "sentinel-agent",
                    message: "Service auth-service is CRITICAL - down for 30 seconds"
                },
                {
                    id: "2",
                    timestamp: new Date(Date.now() - 15000).toISOString(),
                    level: "warn",
                    service: "sentinel-agent",
                    message: "Service payment-service is DEGRADED - high latency detected"
                },
                {
                    id: "3",
                    timestamp: new Date(Date.now() - 30000).toISOString(),
                    level: "success",
                    service: "sentinel-agent",
                    message: "All services HEALTHY - system operating normally"
                },
                {
                    id: "4",
                    timestamp: new Date(Date.now() - 45000).toISOString(),
                    level: "info",
                    service: "sentinel-agent",
                    message: "Health check completed for all services"
                },
                {
                    id: "5",
                    timestamp: new Date(Date.now() - 60000).toISOString(),
                    level: "debug",
                    service: "sentinel-agent",
                    message: "Polling interval: 3000ms, Active monitors: 3"
                }
            ];
            setLogs(mockLogs);
        }
    }, []);

    // Initial data load only — no polling interval
    useEffect(() => {
        void fetchLogs();
    }, [fetchLogs]);

    // React to WebSocket ACTIVITY_LOG messages for real-time log streaming
    useEffect(() => {
        if (!lastMessage || lastMessage.type !== 'ACTIVITY_LOG') return;
        if (isPaused) return; // Respect pause state

        const entry = lastMessage.data;
        const logEntry: LogEntry = {
            id: entry.id.toString(),
            timestamp: entry.timestamp,
            level: classifyLogLevel(entry.type, entry.message),
            service: "sentinel-agent",
            message: entry.message
        };

        setLogs(prev => {
            // Prevent duplicates
            if (prev.some(l => l.id === logEntry.id)) return prev;
            const next = [logEntry, ...prev];
            // Cap at 200 entries to prevent memory bloat
            return next.length > 200 ? next.slice(0, 200) : next;
        });
    }, [lastMessage, isPaused]);

    // Client-side filtering
    const filteredLogs = logs.filter(log => {
        const matchesLevel = filterLevel === "all" || log.level === filterLevel;
        const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase()) ||
            log.service.toLowerCase().includes(search.toLowerCase());
        return matchesLevel && matchesSearch;
    });

    return {
        logs: filteredLogs,
        isPaused,
        setIsPaused,
        filterLevel,
        setFilterLevel,
        search,
        setSearch,
        clearLogs: () => setLogs([])
    };
}
