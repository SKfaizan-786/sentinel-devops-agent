"use client";

import { Spotlight } from "@/components/common/Spotlight";
import { mockIncidents, Incident } from "@/lib/mockData";
import { AlertTriangle, CheckCircle, Clock, XCircle, ChevronRight, Filter } from "lucide-react";
import { Button } from "@/components/common/Button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const StatusIcon = ({ status }: { status: Incident["status"] }) => {
    switch (status) {
        case "resolved": return <CheckCircle className="h-5 w-5 text-green-500" />;
        case "in-progress": return <Clock className="h-5 w-5 text-yellow-500 animate-pulse" />;
        case "failed": return <XCircle className="h-5 w-5 text-red-500" />;
        default: return null;
    }
};

const SeverityBadge = ({ severity }: { severity: Incident["severity"] }) => {
    const colors = {
        critical: "bg-red-500/20 text-red-400 border-red-500/30",
        warning: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        info: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    };
    return (
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium border", colors[severity])}>
            {severity}
        </span>
    );
};

export default function IncidentsPage() {
    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2">Incidents</h1>
                    <p className="text-muted-foreground">Track and manage system incidents and agent actions.</p>
                </div>
                <Button variant="glass" className="gap-2">
                    <Filter className="h-4 w-4" /> Filter
                </Button>
            </div>

            <div className="space-y-4">
                {mockIncidents.map((incident, i) => (
                    <motion.div
                        key={incident.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                    >
                        <Spotlight className="p-5 bg-white/5 border-white/5 hover:border-primary/20 transition-all">
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <div className="mt-1">
                                        <StatusIcon status={incident.status} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-semibold text-white">{incident.title}</h3>
                                            <SeverityBadge severity={incident.severity} />
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            Service: <span className="text-white/80">{incident.serviceId}</span> • {incident.timestamp}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <p className="text-sm text-muted-foreground">Duration</p>
                                        <p className="text-sm font-mono text-white">{incident.duration}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
                                        <ChevronRight className="h-5 w-5" />
                                    </Button>
                                </div>
                            </div>
                        </Spotlight>
                    </motion.div>
                ))}
            </div>
        </div>
    );
}
