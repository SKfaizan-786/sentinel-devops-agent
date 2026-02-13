"use client";

import { Button } from "@/components/common/Button";
import { X, Filter, Calendar } from "lucide-react";
import { FilterState } from "@/hooks/useIncidentHistory";

interface IncidentFiltersProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
    onClear: () => void;
    services: string[];
}

const severityOptions: ("critical" | "warning" | "info")[] = ["critical", "warning", "info"];
const statusOptions: ("resolved" | "in-progress" | "failed")[] = ["resolved", "in-progress", "failed"];

function FilterBadge({ count, onClear }: { count: number; onClear: () => void }) {
    if (count === 0) return null;
    return (
        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-primary text-xs font-medium">
            {count} active
            <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="hover:text-white">
                <X className="h-3 w-3" />
            </button>
        </span>
    );
}

export function IncidentFilters({
    filters,
    onChange,
    onClear,
    services = [],
}: IncidentFiltersProps) {
    const activeFilterCount =
        filters.services.length +
        filters.severities.length +
        filters.statuses.length +
        (filters.dateRange.start ? 1 : 0) +
        (filters.dateRange.end ? 1 : 0);

    const toggleService = (service: string) => {
        const newServices = filters.services.includes(service)
            ? filters.services.filter(s => s !== service)
            : [...filters.services, service];
        onChange({ ...filters, services: newServices });
    };

    const toggleSeverity = (severity: "critical" | "warning" | "info") => {
        const newSeverities = filters.severities.includes(severity)
            ? filters.severities.filter(s => s !== severity)
            : [...filters.severities, severity];
        onChange({ ...filters, severities: newSeverities });
    };

    const toggleStatus = (status: "resolved" | "in-progress" | "failed") => {
        const newStatuses = filters.statuses.includes(status)
            ? filters.statuses.filter(s => s !== status)
            : [...filters.statuses, status];
        onChange({ ...filters, statuses: newStatuses });
    };

    const setDateRange = (field: "start" | "end", value: string) => {
        const date = value ? new Date(value) : null;
        onChange({
            ...filters,
            dateRange: { ...filters.dateRange, [field]: date }
        });
    };

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold text-white">Filters</h3>
                    <FilterBadge count={activeFilterCount} onClear={onClear} />
                </div>
                {activeFilterCount > 0 && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClear}
                        className="text-xs text-muted-foreground hover:text-red-400"
                    >
                        <X className="h-3 w-3 mr-1" />
                        Clear All
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Service Filter */}
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Service
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {services.map((service) => (
                            <button
                                key={service}
                                onClick={() => toggleService(service)}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${filters.services.includes(service)
                                        ? "bg-primary/20 border-primary text-primary font-medium"
                                        : "bg-transparent border-white/10 text-muted-foreground hover:text-white hover:border-white/20"
                                    }`}
                            >
                                {service}
                            </button>
                        ))}
                        {services.length === 0 && (
                            <span className="text-xs text-muted-foreground/50">No services available</span>
                        )}
                    </div>
                </div>

                {/* Severity Filter */}
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Severity
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {severityOptions.map((severity) => (
                            <button
                                key={severity}
                                onClick={() => toggleSeverity(severity)}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${filters.severities.includes(severity)
                                        ? "bg-primary/20 border-primary text-primary font-medium"
                                        : "bg-transparent border-white/10 text-muted-foreground hover:text-white hover:border-white/20"
                                    }`}
                            >
                                {severity === "critical" && "🔴 "}
                                {severity === "warning" && "🟡 "}
                                {severity === "info" && "🟢 "}
                                {severity.charAt(0).toUpperCase() + severity.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                        Status
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                        {statusOptions.map((status) => (
                            <button
                                key={status}
                                onClick={() => toggleStatus(status)}
                                className={`px-2.5 py-1 text-xs rounded-full border transition-all ${filters.statuses.includes(status)
                                        ? "bg-primary/20 border-primary text-primary font-medium"
                                        : "bg-transparent border-white/10 text-muted-foreground hover:text-white hover:border-white/20"
                                    }`}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Date Range */}
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Date Range
                    </label>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            value={filters.dateRange.start?.toISOString().split("T")[0] || ""}
                            onChange={(e) => setDateRange("start", e.target.value)}
                            className="flex-1 bg-black/20 border border-white/10 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                            aria-label="Start date"
                        />
                        <span className="text-muted-foreground text-xs">to</span>
                        <input
                            type="date"
                            value={filters.dateRange.end?.toISOString().split("T")[0] || ""}
                            onChange={(e) => setDateRange("end", e.target.value)}
                            className="flex-1 bg-black/20 border border-white/10 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50"
                            aria-label="End date"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
