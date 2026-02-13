"use client";

import { Incident } from "@/lib/mockData";
import { Zap, Search } from "lucide-react";
import { Button } from "@/components/common/Button";

interface IncidentDetailProps {
    incident: Incident;
    onViewReasoning?: (id: string) => void;
}

export function IncidentDetail({ incident, onViewReasoning }: IncidentDetailProps) {
    return (
        <div className="p-4 bg-black/20 border-t border-white/5 space-y-4">
            {/* Root Cause & Agent Action */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Root Cause
                    </span>
                    <p className="text-sm text-white">{incident.rootCause}</p>
                </div>
                <div className="space-y-1">
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                        Agent Action
                    </span>
                    <p className="text-sm text-primary flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {incident.agentAction}
                    </p>
                </div>
            </div>

            {/* Confidence */}
            <div className="flex items-center gap-4">
                <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Confidence
                </span>
                <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${incident.agentPredictionConfidence}%` }}
                        />
                    </div>
                    <span className="text-sm text-primary font-mono">
                        {incident.agentPredictionConfidence}%
                    </span>
                </div>
            </div>

            {/* Timeline */}
            {incident.timeline && incident.timeline.length > 0 && (
                <div className="pt-2">
                    <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                        Incident Timeline
                    </h5>
                    <div className="space-y-2 relative pl-4 border-l border-white/10 ml-2">
                        {incident.timeline.map((event, idx) => (
                            <div key={idx} className="relative group">
                                <div className="absolute -left-[21px] top-0.5 h-5 w-5 rounded-full bg-background border border-white/10 flex items-center justify-center z-10">
                                    <span className="text-[10px] filter grayscale group-hover:grayscale-0 transition-all">
                                        {event.icon}
                                    </span>
                                </div>
                                <div className="flex items-start gap-2">
                                    <span className="text-xs text-muted-foreground font-mono min-w-[60px]">
                                        {event.time}
                                    </span>
                                    <span className="text-sm text-white">{event.event}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="flex justify-end pt-2">
                <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewReasoning?.(incident.id)}
                >
                    <Search className="h-3 w-3 mr-2" />
                    View Agent Reasoning
                </Button>
            </div>
        </div>
    );
}
