"use client";

import React, { memo } from "react";
import { Incident } from "@/lib/mockData";
import { IncidentCard } from "./IncidentCard";

interface IncidentTimelineProps {
    incidents: Incident[];
    onViewReasoning?: (id: string) => void;
}

export const IncidentTimeline = memo(function IncidentTimeline({ incidents, onViewReasoning }: IncidentTimelineProps) {
    // Group active (in-progress) vs resolved
    const active = incidents.filter(i => i.status !== "resolved");
    const recent = incidents.filter(i => i.status === "resolved");

    return (
        <div className="space-y-6">
            {active.length > 0 && (
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-red-400 uppercase tracking-wider flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                        Active Incidents
                    </h3>
                    {active.map(incident => (
                        <IncidentCard
                            key={incident.id}
                            incident={incident}
                            onViewReasoning={onViewReasoning}
                        />
                    ))}
                </div>
            )}

            <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Recent History
                </h3>
                {recent.map(incident => (
                    <IncidentCard
                        key={incident.id}
                        incident={incident}
                        onViewReasoning={onViewReasoning}
                    />
                ))}
            </div>
        </div>
    );
});

IncidentTimeline.displayName = "IncidentTimeline";
