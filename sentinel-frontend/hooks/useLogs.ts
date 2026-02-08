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
            if (!res.ok) return;
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
            console.error(e);
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
