"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Suspense, useState, useCallback, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Activity, Clock, AlertCircle, FileWarning } from "lucide-react";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import { IncidentFilters } from "@/components/incidents/IncidentFilters";
import { IncidentSearch } from "@/components/incidents/IncidentSearch";
import { IncidentExport } from "@/components/incidents/IncidentExport";
import { TableSkeleton } from "@/components/incidents/TableSkeleton";
import { Pagination } from "@/components/common/Pagination";
import { useIncidentHistory, FilterState, SortConfig } from "@/hooks/useIncidentHistory";
import { CorrelatedIncidentGroup, CorrelatedGroupData } from "@/components/incidents/CorrelatedIncidentGroup";
import { Button } from "@/components/common/Button";

const defaultFilters: FilterState = {
    services: [],
    severities: [],
    statuses: [],
    dateRange: { start: null, end: null },
};

function IncidentsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Initialize state from URL params
    const [filters, setFilters] = useState<FilterState>(() => {
        const services = searchParams.get("services")?.split(",").filter(Boolean) || [];
        const severities = (searchParams.get("severities")?.split(",").filter(Boolean) || []) as FilterState["severities"];
        const statuses = (searchParams.get("statuses")?.split(",").filter(Boolean) || []) as FilterState["statuses"];
        const startDate = searchParams.get("start");
        const endDate = searchParams.get("end");

        return {
            services,
            severities,
            statuses,
            dateRange: {
                start: startDate ? new Date(startDate) : null,
                end: endDate ? new Date(endDate) : null,
            },
        };
    });

    const [search, setSearch] = useState(searchParams.get("q") || "");
    const [sortConfig, setSortConfig] = useState<SortConfig>(() => {
        const sortKey = searchParams.get("sortBy") || "timestamp";
        const sortDir = searchParams.get("sortDir") || "desc";
        return { key: sortKey as SortConfig["key"], direction: sortDir as SortConfig["direction"] };
    });
    const [page, setPage] = useState(Number(searchParams.get("page")) || 1);
    const [pageSize, setPageSize] = useState(Number(searchParams.get("pageSize")) || 10);

    const { incidents, allFilteredIncidents, isLoading, totalCount, totalActive, totalCritical, allServices } = useIncidentHistory({
        filters,
        search,
        sort: sortConfig,
        page,
        pageSize,
    });

    // Sync URL with state
    useEffect(() => {
        const params = new URLSearchParams();

        if (search) params.set("q", search);
        if (filters.services.length) params.set("services", filters.services.join(","));
        if (filters.severities.length) params.set("severities", filters.severities.join(","));
        if (filters.statuses.length) params.set("statuses", filters.statuses.join(","));
        if (filters.dateRange.start) params.set("start", filters.dateRange.start.toISOString().split("T")[0]);
        if (filters.dateRange.end) params.set("end", filters.dateRange.end.toISOString().split("T")[0]);
        if (sortConfig.key !== "timestamp") params.set("sortBy", sortConfig.key);
        if (sortConfig.direction !== "desc") params.set("sortDir", sortConfig.direction);
        if (page > 1) params.set("page", String(page));
        if (pageSize !== 10) params.set("pageSize", String(pageSize));

        const queryString = params.toString();
        const newUrl = queryString ? `?${queryString}` : "";

        // Only update if different to avoid infinite loops
        if (newUrl !== (window.location.search || "")) {
            router.replace(`/dashboard/incidents${newUrl}`, { scroll: false });
        }
    }, [filters, search, sortConfig, page, pageSize, router]);

    const [correlatedGroups, setCorrelatedGroups] = useState<CorrelatedGroupData[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        const fetchCorrelatedGroups = async () => {
            try {
                const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
                const res = await fetch(`${apiUrl}/incidents/correlated`, {
                    signal: controller.signal,
                });
                if (!res.ok) throw new Error(`Failed to fetch correlated groups (${res.status})`);
                const data = await res.json();
                setCorrelatedGroups(data.groups || []);
                setFetchError(null);
            } catch (err: unknown) {
                if (err instanceof Error && err.name === 'AbortError') return;
                const message = err instanceof Error ? err.message : 'Unknown error';
                console.error('Error fetching correlated groups:', message);
                setFetchError(message);
            }
        };

        fetchCorrelatedGroups();
        const interval = setInterval(fetchCorrelatedGroups, 10000);

        return () => {
            controller.abort();
            clearInterval(interval);
        };
    }, []);

    // Memoize derived values to avoid recomputation on every render
    const groupedServiceIds = useMemo(() => {
        const ids = new Set<string>();
        for (const group of correlatedGroups) {
            for (const containerId of group.affectedContainers) {
                ids.add(containerId);
            }
        }
        return ids;
    }, [correlatedGroups]);

    const standaloneIncidentsFull = useMemo(
        () => allFilteredIncidents.filter(i => !groupedServiceIds.has(i.serviceId)),
        [allFilteredIncidents, groupedServiceIds]
    );

    const paginatedStandaloneIncidents = useMemo(() => {
        const startIndex = (page - 1) * pageSize;
        return standaloneIncidentsFull.slice(startIndex, startIndex + pageSize);
    }, [standaloneIncidentsFull, page, pageSize]);

    const standaloneCount = standaloneIncidentsFull.length;

    const handleSort = useCallback((key: string) => {
        setSortConfig((prev) => ({
            key: key as SortConfig["key"],
            direction: prev.key === key && prev.direction === "desc" ? "asc" : "desc",
        }));
        setPage(1); // Reset to first page on sort change
    }, []);

    const handleClearFilters = useCallback(() => {
        setFilters(defaultFilters);
        setSearch("");
        setPage(1);
    }, []);

    const handlePageSizeChange = useCallback((newSize: number) => {
        setPageSize(newSize);
        setPage(1);
    }, []);

    const handleFilterChange = useCallback((newFilters: FilterState) => {
        setFilters(newFilters);
        setPage(1);
    }, []);

    const totalPages = Math.ceil(standaloneCount / pageSize);

    return (
        <div className="w-full max-w-full overflow-x-hidden">
            <DashboardHeader />
            <div className="container mx-auto max-w-7xl px-2 sm:px-4 lg:px-6 pb-20 space-y-4 sm:space-y-6">
                {/* Header */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 px-2 sm:px-0">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-white">Incident History</h1>
                        <p className="text-muted-foreground">
                            Comprehensive log of all system incidents and agent remediations.
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="default"
                            shortcutHint="N"
                            onClick={() => router.push('/dashboard/incidents/new')}
                            className="bg-primary hover:bg-primary/90 hidden sm:flex"
                        >
                            New Incident
                        </Button>
                        <IncidentExport incidents={incidents} disabled={isLoading} />
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wider font-semibold">Total</span>
                        </div>
                        <div className="text-2xl font-bold text-white">{totalCount + correlatedGroups.reduce((sum, g) => sum + (g.incidents?.length || 0), 0)}</div>
                        {correlatedGroups.length > 0 && (
                            <p className="text-xs text-muted-foreground mt-1">
                                {correlatedGroups.reduce((sum, g) => sum + (g.incidents?.length || 0), 0)} grouped · {standaloneCount} standalone
                            </p>
                        )}
                    </div>
                    <div className="p-3 sm:p-4 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Activity className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wider font-semibold">Active</span>
                        </div>
                        <div className="text-2xl font-bold text-yellow-400">{totalActive}</div>
                    </div>
                    <div className="p-3 sm:p-4 bg-white/5 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <FileWarning className="h-4 w-4" />
                            <span className="text-xs uppercase tracking-wider font-semibold">Critical</span>
                        </div>
                        <div className="text-2xl font-bold text-red-400">{totalCritical}</div>
                    </div>
                    <div className="p-3 sm:p-4 bg-white/5 border border-white/5 rounded-xl overflow-hidden">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                            <Clock className="h-4 w-4 shrink-0" />
                            <span className="text-xs uppercase tracking-wider font-semibold">MTTR</span>
                        </div>
                        <div className="text-2xl font-bold text-white truncate">
                            {(() => {
                                const resolvedIncidents = allFilteredIncidents.filter(
                                    (i) => i.status === "resolved" && i.duration !== "N/A"
                                );
                                if (resolvedIncidents.length === 0) return "—";

                                let totalSeconds = 0;
                                let count = 0;

                                resolvedIncidents.forEach((inc) => {
                                    const mMatch = inc.duration.match(/(\d+)m/);
                                    const sMatch = inc.duration.match(/(\d+)s/);
                                    let seconds = 0;
                                    if (mMatch) seconds += parseInt(mMatch[1]) * 60;
                                    if (sMatch) seconds += parseInt(sMatch[1]);

                                    if (seconds > 0) {
                                        totalSeconds += seconds;
                                        count++;
                                    }
                                });

                                if (count === 0) return "—";
                                const avgSeconds = Math.round(totalSeconds / count);
                                const avgM = Math.floor(avgSeconds / 60);
                                const avgS = avgSeconds % 60;

                                if (avgM > 0) return `${avgM}m ${avgS}s`;
                                return `${avgS}s`;
                            })()}
                        </div>
                    </div>
                </div>

                {/* Search */}
                <IncidentSearch value={search} onChange={setSearch} />

                {/* Filters */}
                <IncidentFilters
                    filters={filters}
                    onChange={handleFilterChange}
                    onClear={handleClearFilters}
                    services={allServices}
                />

                {/* Results count */}
                <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                        {standaloneCount} Standalone Incident{standaloneCount !== 1 && "s"} Found
                    </h2>
                </div>

                {/* Correlation fetch error */}
                {fetchError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>Failed to load correlated groups: {fetchError}</span>
                    </div>
                )}

                {/* Table or Empty/Loading State */}
                {isLoading ? (
                    <TableSkeleton rows={pageSize} />
                ) : (allFilteredIncidents.length > 0 || correlatedGroups.length > 0) ? (
                    <>
                        {correlatedGroups.map(group => {
                            const groupIncidents = group.incidents || [];
                            if (groupIncidents.length === 0) return null;
                            return (
                                <CorrelatedIncidentGroup
                                    key={group.groupId}
                                    group={group}
                                    incidents={groupIncidents}
                                />
                            );
                        })}

                        {paginatedStandaloneIncidents.length > 0 && (
                            <IncidentTable
                                incidents={paginatedStandaloneIncidents}
                                onSort={handleSort}
                                sortConfig={sortConfig}
                            />
                        )}
                        {totalPages > 1 && (
                            <Pagination
                                currentPage={page}
                                totalPages={totalPages}
                                totalCount={standaloneCount}
                                pageSize={pageSize}
                                onPageChange={setPage}
                                onPageSizeChange={handlePageSizeChange}
                            />
                        )}
                    </>
                ) : (
                    <div className="text-center py-20 bg-white/5 border border-white/10 rounded-xl border-dashed">
                        <FileWarning className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground mb-2">No incidents found matching your criteria.</p>
                        <button
                            onClick={handleClearFilters}
                            className="text-primary text-sm hover:underline"
                        >
                            Clear all filters
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

function IncidentsLoadingFallback() {
    return (
        <div className="w-full max-w-full overflow-x-hidden">
            <div className="container mx-auto max-w-7xl px-2 sm:px-4 lg:px-6 pb-20 space-y-4 sm:space-y-6">
                <div className="px-2 sm:px-0">
                    <h1 className="text-3xl font-bold tracking-tight text-white">Incident History</h1>
                    <p className="text-muted-foreground">
                        Comprehensive log of all system incidents and agent remediations.
                    </p>
                </div>
                <TableSkeleton rows={10} />
            </div>
        </div>
    );
}

export default function IncidentsPage() {
    return (
        <Suspense fallback={<IncidentsLoadingFallback />}>
            <IncidentsContent />
        </Suspense>
    );
}
