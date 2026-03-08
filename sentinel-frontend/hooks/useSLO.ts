"use client";

import { useEffect, useState, useCallback } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export interface SLOBudget {
    targetAvailability: number;
    currentAvailability: number;
    trackingWindow: string;
    windowMinutes: number;
    allowedDowntimeMinutes: number;
    usedDowntimeMinutes: number;
    remainingMinutes: number;
    budgetPercent: number;
    burndownRatePerDay: number;
    projectedExhaustionDate: string | null;
    incidentCount: number;
    status: "healthy" | "warning" | "critical" | "exhausted";
}

export interface SLODefinition {
    id: string;
    serviceId: string;
    serviceName: string;
    targetAvailability: number;
    trackingWindow: string;
    includeScheduledMaintenance: boolean;
    alertThreshold: number;
    createdAt: string;
    updatedAt: string;
    budget: SLOBudget;
}

export interface SLOSummary {
    total: number;
    healthy: number;
    warning: number;
    critical: number;
}

export interface BurndownPoint {
    timestamp: string;
    budgetPercent: number;
    usedMinutes: number;
}

export interface SLODetail extends SLODefinition {
    burndown: BurndownPoint[];
    incidents: Array<{
        id: string;
        serviceId: string;
        downtimeMinutes: number;
        description: string;
        resolvedAt: number;
        createdAt: number;
    }>;
}

export function useSLO(refreshInterval = 30000) {
    const [slos, setSlos] = useState<SLODefinition[]>([]);
    const [summary, setSummary] = useState<SLOSummary>({
        total: 0,
        healthy: 0,
        warning: 0,
        critical: 0,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSLOs = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/slo`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setSlos(data.slos || []);
            setSummary(data.summary || { total: 0, healthy: 0, warning: 0, critical: 0 });
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to fetch SLOs");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSLOs();
        const interval = setInterval(fetchSLOs, refreshInterval);
        return () => clearInterval(interval);
    }, [fetchSLOs, refreshInterval]);

    const fetchSLODetail = useCallback(async (id: string): Promise<SLODetail | null> => {
        try {
            const res = await fetch(`${API_URL}/slo/${id}`);
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    }, []);

    const createSLO = useCallback(
        async (data: {
            serviceId: string;
            serviceName?: string;
            targetAvailability: number;
            trackingWindow: string;
            alertThreshold?: number;
        }) => {
            const res = await fetch(`${API_URL}/slo`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create SLO");
            }
            await fetchSLOs();
            return await res.json();
        },
        [fetchSLOs]
    );

    const deleteSLO = useCallback(
        async (id: string) => {
            const res = await fetch(`${API_URL}/slo/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete SLO");
            await fetchSLOs();
        },
        [fetchSLOs]
    );

    const recordDowntime = useCallback(
        async (id: string, downtimeMinutes: number, description?: string) => {
            const res = await fetch(`${API_URL}/slo/${id}/downtime`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ downtimeMinutes, description }),
            });
            if (!res.ok) throw new Error("Failed to record downtime");
            await fetchSLOs();
            return await res.json();
        },
        [fetchSLOs]
    );

    return {
        slos,
        summary,
        loading,
        error,
        refresh: fetchSLOs,
        fetchSLODetail,
        createSLO,
        deleteSLO,
        recordDowntime,
    };
}
