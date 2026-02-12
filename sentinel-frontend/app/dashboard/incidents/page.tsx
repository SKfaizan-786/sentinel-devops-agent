"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { IncidentCard } from "@/components/dashboard/IncidentCard";
import { IncidentFilters } from "@/components/incidents/IncidentFilters";
import { useIncidents } from "@/hooks/useIncidents";
import { useState } from "react";
import { Activity, Clock, AlertCircle } from "lucide-react";

export default function IncidentsPage() {
    const { incidents } = useIncidents();
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [severityFilter, setSeverityFilter] = useState("all");

    // Filter Logic
    const query = search.trim().toLowerCase();
    const filteredIncidents = incidents.filter((incident) => {
        const matchesSearch =
            !query ||
            incident.title.toLowerCase().includes(query) ||
            incident.serviceId.toLowerCase().includes(query) ||
            incident.rootCause.toLowerCase().includes(query) ||
            incident.id.toLowerCase().includes(query);

        const matchesStatus = statusFilter === "all" || incident.status === statusFilter;
        const matchesSeverity = severityFilter === "all" || incident.severity === severityFilter;

        return matchesSearch && matchesStatus && matchesSeverity;
    });

    // Stats Logic
    const totalIncidents = incidents.length;
    const activeIncidents = incidents.filter(i => i.status !== "resolved").length;
    // Mock MTTR calculation
    const mttr = "12m";

    return (
        <div>
            <DashboardHeader />
            <div className="p-4 lg:p-6">
                <div className="container mx-auto max-w-7xl pb-20 space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-2 text-white">Incident History</h1>
                        <p className="text-muted-foreground">Comprehensive log of all system outages and agent remediations.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Sidebar: Filters & Stats */}
                        <div className="space-y-6">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
                                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                        <Activity className="h-4 w-4" />
                                        <span className="text-xs uppercase tracking-wider font-semibold">Active</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white">{activeIncidents}</div>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                        <Clock className="h-4 w-4" />
                                        <span className="text-xs uppercase tracking-wider font-semibold">MTTR</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white">{mttr}</div>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/5 rounded-xl col-span-2 lg:col-span-1">
                                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                                        <AlertCircle className="h-4 w-4" />
                                        <span className="text-xs uppercase tracking-wider font-semibold">Total</span>
                                    </div>
                                    <div className="text-2xl font-bold text-white">{totalIncidents}</div>
                                </div>
                            </div>

                            <IncidentFilters
                                search={search}
                                setSearch={setSearch}
                                statusFilter={statusFilter}
                                setStatusFilter={setStatusFilter}
                                severityFilter={severityFilter}
                                setSeverityFilter={setSeverityFilter}
                            />
                        </div>

                        {/* Main Content: Incident List */}
                        <div className="lg:col-span-3 space-y-4">
                            <h2 className="text-lg font-semibold text-white mb-4">
                                {filteredIncidents.length} Incident{filteredIncidents.length !== 1 && 's'} Found
                            </h2>

                            {filteredIncidents.length > 0 ? (
                                <div className="space-y-4">
                                    {filteredIncidents.map((incident) => (
                                        <IncidentCard key={incident.id} incident={incident} />
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-20 bg-white/5 border border-white/5 rounded-xl border-dashed">
                                    <p className="text-muted-foreground">No incidents found matches your criteria.</p>
                                    <button
                                        onClick={() => { setSearch(""); setStatusFilter("all"); setSeverityFilter("all"); }}
                                        className="text-primary text-sm mt-2 hover:underline"
                                    >
                                        Clear filters
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
