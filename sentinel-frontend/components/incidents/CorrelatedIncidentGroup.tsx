"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Incident } from "@/lib/mockData";
import { IncidentTable } from "./IncidentTable";

export interface CorrelatedGroupData {
    groupId: string;
    rootCauseContainerId: string;
    rootCauseProbability?: number;
    affectedContainers: string[];
    blastRadius: number;
    correlationSignals?: string[];
    suppressedAlerts: number;
    incidents?: Incident[];
}

interface CorrelatedIncidentGroupProps {
    group: CorrelatedGroupData;
    incidents: Incident[]; // The actual matched incident objects
}

export function CorrelatedIncidentGroup({ group, incidents }: CorrelatedIncidentGroupProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="border border-orange-500/30 rounded-lg p-4 bg-orange-500/5 mb-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
                <div>
                    <span className="text-sm font-semibold text-orange-400 flex items-center gap-2 mb-1">
                        🔗 Correlated Incident Group
                    </span>
                    <p className="text-sm text-white font-medium">
                        1 Root Cause → {Math.max(0, group.affectedContainers.length - 1)} Affected Services
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-xs text-muted-foreground block">{group.suppressedAlerts} alerts suppressed</span>
                    <button
                        onClick={() => setExpanded(!expanded)}
                        aria-expanded={expanded}
                        aria-controls={`group-details-${group.groupId}`}
                        className="text-xs text-orange-400 hover:text-orange-300 mt-1 flex items-center justify-end gap-1 w-full"
                    >
                        {expanded ? <><ChevronUp className="h-3 w-3" /> Hide Details</> : <><ChevronDown className="h-3 w-3" /> Show {incidents.length} Incidents</>}
                    </button>
                </div>
            </div>

            <p className="text-sm mb-3 text-muted-foreground">
                <strong>Likely root cause:</strong> <code className="text-orange-300 bg-orange-500/10 px-1 py-0.5 rounded ml-1">{group.rootCauseContainerId}</code>
            </p>

            <div className="flex flex-wrap gap-2 mb-2">
                {group.affectedContainers.map(c => (
                    <span key={c} className={`text-xs px-2 py-1 rounded border ${c === group.rootCauseContainerId ? 'bg-orange-500/20 border-orange-500/30 text-orange-300' : 'bg-white/5 border-white/10 text-muted-foreground'}`}>{c}</span>
                ))}
            </div>

            {expanded && (
                <div id={`group-details-${group.groupId}`} className="mt-4 pt-4 border-t border-orange-500/20">
                    <IncidentTable
                        incidents={incidents}
                        onSort={() => { }}
                        sortConfig={{ key: "timestamp", direction: "desc" }}
                    />
                </div>
            )}
        </div>
    );
}
