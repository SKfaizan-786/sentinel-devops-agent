"use client";

import { Button } from "@/components/common/Button";
import { Search, Filter, X } from "lucide-react";

interface IncidentFiltersProps {
    search: string;
    setSearch: (value: string) => void;
    statusFilter: string;
    setStatusFilter: (value: string) => void;
    severityFilter: string;
    setSeverityFilter: (value: string) => void;
}

export function IncidentFilters({
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    severityFilter,
    setSeverityFilter
}: IncidentFiltersProps) {
    return (
        <div className="space-y-4 bg-white/5 border border-white/5 p-4 rounded-xl">
            <div className="flex items-center gap-2 mb-2">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-white">Filters</h3>
            </div>
            
            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search incidents..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full bg-black/20 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50 transition-all"
                />
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Status</label>
                <div className="flex flex-wrap gap-2">
                    {["all", "in-progress", "resolved", "failed"].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-3 py-1 text-xs rounded-full border transition-all ${
                                statusFilter === status
                                    ? "bg-primary/20 border-primary text-primary font-medium"
                                    : "bg-transparent border-white/10 text-muted-foreground hover:text-white hover:border-white/20"
                            }`}
                        >
                            {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                        </button>
                    ))}
                </div>
            </div>

            {/* Severity Filter */}
            <div className="space-y-2">
                <label className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Severity</label>
                <div className="flex flex-wrap gap-2">
                    {["all", "critical", "warning", "info"].map((severity) => (
                        <button
                            key={severity}
                            onClick={() => setSeverityFilter(severity)}
                            className={`px-3 py-1 text-xs rounded-full border transition-all ${
                                severityFilter === severity
                                    ? "bg-primary/20 border-primary text-primary font-medium"
                                    : "bg-transparent border-white/10 text-muted-foreground hover:text-white hover:border-white/20"
                            }`}
                        >
                            {severity === "all" ? "All" : severity.charAt(0).toUpperCase() + severity.slice(1)}
                        </button>
                    ))}
                </div>
            </div>
            
            {/* Clear Filters */}
            {(search || statusFilter !== "all" || severityFilter !== "all") && (
                <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs text-muted-foreground hover:text-red-400"
                    onClick={() => {
                        setSearch("");
                        setStatusFilter("all");
                        setSeverityFilter("all");
                    }}
                >
                    <X className="h-3 w-3 mr-1" />
                    Clear Filters
                </Button>
            )}
        </div>
    );
}
