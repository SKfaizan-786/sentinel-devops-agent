"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export type LogLevel = "info" | "warn" | "error" | "debug" | "success";

export interface LogEntry {
    id: string;
    timestamp: string;
    level: LogLevel;
    service: string;
    message: string;
}

export function useLogs() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [isPaused, setIsPaused] = useState(false);
    const [filterLevel, setFilterLevel] = useState<LogLevel | "all">("all");
    const [search, setSearch] = useState("");
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchLogs = useCallback(async () => {
        if (isPaused) return;
        try {
            const res = await fetch("http://localhost:4000/api/activity");
            if (!res.ok) throw new Error("Backend not available");
            const data = await res.json();

            // Transform backend logs to frontend format
            if (data.activity) {
                const formattedLogs: LogEntry[] = data.activity.map((entry: { type: string; message: string; id: number; timestamp: string }) => {
                    let level: LogLevel = "info";
                    if (entry.type === 'alert' || entry.message.includes("CRITICAL") || entry.message.includes("down")) level = "error";
                    else if (entry.type === 'success' || entry.message.includes("HEALTHY")) level = "success";
                    else if (entry.message.includes("DEGRADED")) level = "warn";

                    return {
                        id: entry.id.toString(),
                        timestamp: entry.timestamp,
                        level: level,
                        service: "sentinel-agent", // Ideally backend provides source
                        message: entry.message
                    };
                });
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
    }, [isPaused]);

    useEffect(() => {
        // eslint-disable-next-line
        void fetchLogs(); // Async call, safe to ignore sync warning
        intervalRef.current = setInterval(fetchLogs, 3000);
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [fetchLogs]);

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
