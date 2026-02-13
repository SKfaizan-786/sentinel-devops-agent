"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Incident, mockIncidents } from "@/lib/mockData";
import { parseInsight } from "@/lib/parseInsight";

export interface FilterState {
    services: string[];
    severities: ("critical" | "warning" | "info")[];
    statuses: ("resolved" | "in-progress" | "failed")[];
    dateRange: { start: Date | null; end: Date | null };
}

export interface SortConfig {
    key: keyof Incident | "timestamp" | "severity" | "status" | "duration";
    direction: "asc" | "desc";
}

interface UseIncidentHistoryProps {
    filters: FilterState;
    search: string;
    sort: SortConfig;
    page: number;
    pageSize: number;
}

interface UseIncidentHistoryResult {
    incidents: Incident[];
    isLoading: boolean;
    totalCount: number;
    totalActive: number;
    totalCritical: number;
    allServices: string[];
}

// Extended mock data for demonstration
const extendedMockIncidents: Incident[] = [
    ...mockIncidents,
    {
        id: "inc-4",
        title: "Database Connection Pool Exhausted",
        serviceId: "database-service",
        status: "resolved",
        severity: "critical",
        timestamp: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
        duration: "8m 15s",
        rootCause: "Connection leak in query handler",
        agentAction: "Restarted connection pool and killed stale connections",
        agentPredictionConfidence: 94,
        timeline: [
            { time: "10:00:00", event: "Connection pool at 100% capacity", icon: "🔴" },
            { time: "10:00:30", event: "Agent identified connection leak", icon: "🔍" },
            { time: "10:02:00", event: "Pool reset initiated", icon: "🔧" },
            { time: "10:08:15", event: "Service recovered", icon: "✅" },
        ],
    },
    {
        id: "inc-5",
        title: "API Rate Limiting Triggered",
        serviceId: "api-gateway",
        status: "resolved",
        severity: "warning",
        timestamp: new Date(Date.now() - 1000 * 60 * 300).toISOString(),
        duration: "2m 30s",
        rootCause: "Traffic spike from marketing campaign",
        agentAction: "Temporarily increased rate limits",
        agentPredictionConfidence: 87,
        timeline: [
            { time: "08:30:00", event: "Rate limit threshold exceeded", icon: "⚠️" },
            { time: "08:30:15", event: "Agent analysis: Traffic spike detected", icon: "🤖" },
            { time: "08:31:00", event: "Rate limits adjusted", icon: "🔧" },
            { time: "08:32:30", event: "Traffic normalized", icon: "✅" },
        ],
    },
    {
        id: "inc-6",
        title: "Cache Invalidation Storm",
        serviceId: "cache-service",
        status: "in-progress",
        severity: "warning",
        timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        duration: "Ongoing",
        rootCause: "Bulk update triggered mass invalidation",
        agentAction: "Implementing staggered invalidation",
        agentPredictionConfidence: 78,
        timeline: [
            { time: new Date(Date.now() - 1000 * 60 * 15).toLocaleTimeString(), event: "Cache hit ratio dropped to 12%", icon: "⚠️" },
            { time: new Date(Date.now() - 1000 * 60 * 14).toLocaleTimeString(), event: "Agent detected invalidation storm", icon: "🤖" },
            { time: new Date(Date.now() - 1000 * 60 * 12).toLocaleTimeString(), event: "Staggered invalidation in progress", icon: "🔧" },
        ],
    },
    {
        id: "inc-7",
        title: "Memory Leak in Notification Worker",
        serviceId: "notification-service",
        status: "resolved",
        severity: "info",
        timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        duration: "45m",
        rootCause: "Event listeners not properly cleaned up",
        agentAction: "Scheduled worker restart during low traffic",
        agentPredictionConfidence: 92,
        timeline: [
            { time: "02:00:00", event: "Memory usage at 85%", icon: "⚠️" },
            { time: "02:15:00", event: "Agent scheduled restart", icon: "🔧" },
            { time: "02:45:00", event: "Worker restarted successfully", icon: "✅" },
        ],
    },
];

const severityOrder: Record<string, number> = { critical: 3, warning: 2, info: 1 };
const statusOrder: Record<string, number> = { failed: 3, "in-progress": 2, resolved: 1 };

export function useIncidentHistory({
    filters,
    search,
    sort,
    page,
    pageSize,
}: UseIncidentHistoryProps): UseIncidentHistoryResult {
    const [isLoading, setIsLoading] = useState(true);
    const [incidents, setIncidents] = useState<Incident[]>([]);

    // Simulate API fetch
    const fetchIncidents = useCallback(async () => {
        setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
            const res = await fetch(`${apiUrl}/insights`);
            if (!res.ok) throw new Error('Failed to fetch');
            const data = await res.json();

            // Transform API data to Incident type
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const apiIncidents: Incident[] = (data.insights || []).map((insight: any) => parseInsight(insight));

            // Conditionally append mocks
            // TODO: Remove this flag once backend has enough real data
            const includeMocks = process.env.NEXT_PUBLIC_INCLUDE_MOCK_INCIDENTS === 'true';

            if (includeMocks) {
                setIncidents([...apiIncidents, ...extendedMockIncidents]);
            } else {
                setIncidents(apiIncidents);
            }
        } catch (err) {
            console.error(err);
            // Fallback to mocks if API fails, or empty state?
            // For now, keep fallback to mocks as safety net during dev
            setIncidents(extendedMockIncidents);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchIncidents();
    }, [fetchIncidents]);

    // Extract all unique services
    const allServices = useMemo(() => {
        const services = new Set(incidents.map((i) => i.serviceId));
        return Array.from(services).sort();
    }, [incidents]);

    // Filter incidents
    const filteredIncidents = useMemo(() => {
        return incidents.filter((incident) => {
            // Search filter
            if (search) {
                const query = search.toLowerCase();
                const matchesSearch =
                    incident.title.toLowerCase().includes(query) ||
                    incident.serviceId.toLowerCase().includes(query) ||
                    incident.rootCause.toLowerCase().includes(query) ||
                    incident.id.toLowerCase().includes(query);
                if (!matchesSearch) return false;
            }

            // Service filter
            if (filters.services.length > 0 && !filters.services.includes(incident.serviceId)) {
                return false;
            }

            // Severity filter
            if (filters.severities.length > 0 && !filters.severities.includes(incident.severity)) {
                return false;
            }

            // Status filter
            if (filters.statuses.length > 0 && !filters.statuses.includes(incident.status)) {
                return false;
            }

            // Date range filter
            if (filters.dateRange.start || filters.dateRange.end) {
                const incidentDate = new Date(incident.timestamp);
                if (filters.dateRange.start && incidentDate < filters.dateRange.start) {
                    return false;
                }
                if (filters.dateRange.end) {
                    const endOfDay = new Date(filters.dateRange.end);
                    endOfDay.setHours(23, 59, 59, 999);
                    if (incidentDate > endOfDay) {
                        return false;
                    }
                }
            }

            return true;
        });
    }, [incidents, search, filters]);

    // Sort incidents
    const sortedIncidents = useMemo(() => {
        const sorted = [...filteredIncidents].sort((a, b) => {
            let comparison = 0;

            switch (sort.key) {
                case "timestamp":
                    comparison = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
                    break;
                case "severity":
                    comparison = (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
                    break;
                case "status":
                    comparison = (statusOrder[a.status] || 0) - (statusOrder[b.status] || 0);
                    break;
                case "title":
                    comparison = a.title.localeCompare(b.title);
                    break;
                case "serviceId":
                    comparison = a.serviceId.localeCompare(b.serviceId);
                    break;
                default:
                    comparison = 0;
            }

            return sort.direction === "asc" ? comparison : -comparison;
        });

        return sorted;
    }, [filteredIncidents, sort]);

    // Paginate
    const paginatedIncidents = useMemo(() => {
        const startIndex = (page - 1) * pageSize;
        return sortedIncidents.slice(startIndex, startIndex + pageSize);
    }, [sortedIncidents, page, pageSize]);

    // Calculate aggregates from full dataset
    const totalActive = useMemo(() => incidents.filter((i) => i.status !== "resolved").length, [incidents]);
    const totalCritical = useMemo(() => incidents.filter((i) => i.severity === "critical").length, [incidents]);

    return {
        incidents: paginatedIncidents,
        isLoading,
        totalCount: sortedIncidents.length,
        totalActive,
        totalCritical,
        allServices,
    };
}
