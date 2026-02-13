"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import { Incident } from "@/lib/mockData";
import { getSeverityColor } from "@/lib/theme";
import { IncidentDetail } from "./IncidentDetail";
import { motion, AnimatePresence } from "framer-motion";
import { SortConfig } from "@/hooks/useIncidentHistory";

interface Column {
    key: string;
    label: string;
    sortable?: boolean;
    className?: string;
}

const columns: Column[] = [
    { key: "timestamp", label: "Time", sortable: true, className: "w-[120px]" },
    { key: "serviceId", label: "Service", sortable: true, className: "w-[140px]" },
    { key: "severity", label: "Severity", sortable: true, className: "w-[100px]" },
    { key: "title", label: "Description", sortable: true },
    { key: "status", label: "Status", sortable: true, className: "w-[120px]" },
    { key: "duration", label: "Duration", sortable: false, className: "w-[100px]" },
];

interface IncidentTableProps {
    incidents: Incident[];
    onSort: (key: string) => void;
    sortConfig: SortConfig;
    onViewReasoning?: (id: string) => void;
}

function SortIndicator({ active, direction }: { active: boolean; direction: "asc" | "desc" }) {
    if (!active) {
        return (
            <span className="text-muted-foreground/30">
                <ChevronUp className="h-3 w-3 -mb-1" />
                <ChevronDown className="h-3 w-3 -mt-1" />
            </span>
        );
    }
    return direction === "asc" ? (
        <ChevronUp className="h-4 w-4 text-primary" />
    ) : (
        <ChevronDown className="h-4 w-4 text-primary" />
    );
}

function SeverityBadge({ severity }: { severity: "critical" | "warning" | "info" }) {
    const colors = getSeverityColor(severity);
    return (
        <span
            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
        >
            {severity === "critical" && "🔴 "}
            {severity === "warning" && "🟡 "}
            {severity === "info" && "🟢 "}
            {severity.toUpperCase()}
        </span>
    );
}

function StatusBadge({ status }: { status: "resolved" | "in-progress" | "failed" }) {
    const statusStyles: Record<string, string> = {
        resolved: "bg-green-500/10 text-green-400 border-green-500/30",
        "in-progress": "bg-yellow-500/10 text-yellow-400 border-yellow-500/30",
        failed: "bg-red-500/10 text-red-400 border-red-500/30",
    };

    const statusIcons: Record<string, string> = {
        resolved: "✅",
        "in-progress": "⏳",
        failed: "❌",
    };

    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status]}`}
        >
            {statusIcons[status]} {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

function formatTimestamp(timestamp: string): string {
    try {
        const date = new Date(timestamp);
        return date.toLocaleString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    } catch {
        return timestamp;
    }
}

interface IncidentRowProps {
    incident: Incident;
    onViewReasoning?: (id: string) => void;
}

function IncidentRow({ incident, onViewReasoning }: IncidentRowProps) {
    const [expanded, setExpanded] = useState(false);

    return (
        <>
            <tr
                className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <td className="p-3">
                    <div className="flex items-center gap-2">
                        <ChevronRight
                            className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""
                                }`}
                        />
                        <span className="text-sm text-muted-foreground font-mono">
                            {formatTimestamp(incident.timestamp)}
                        </span>
                    </div>
                </td>
                <td className="p-3">
                    <span className="text-sm text-white">{incident.serviceId}</span>
                </td>
                <td className="p-3">
                    <SeverityBadge severity={incident.severity} />
                </td>
                <td className="p-3">
                    <span className="text-sm text-white line-clamp-1">{incident.title}</span>
                </td>
                <td className="p-3">
                    <StatusBadge status={incident.status} />
                </td>
                <td className="p-3">
                    <span className="text-sm text-muted-foreground">{incident.duration}</span>
                </td>
            </tr>
            <AnimatePresence>
                {expanded && (
                    <tr>
                        <td colSpan={6} className="p-0">
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                            >
                                <IncidentDetail incident={incident} onViewReasoning={onViewReasoning} />
                            </motion.div>
                        </td>
                    </tr>
                )}
            </AnimatePresence>
        </>
    );
}

export function IncidentTable({
    incidents,
    onSort,
    sortConfig,
    onViewReasoning,
}: IncidentTableProps) {
    return (
        <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-white/10 bg-white/5">
                            {columns.map((col) => (
                                <th
                                    key={col.key}
                                    onClick={() => col.sortable && onSort(col.key)}
                                    className={`p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider ${col.className || ""
                                        } ${col.sortable ? "cursor-pointer hover:text-white transition-colors" : ""}`}
                                >
                                    <div className="flex items-center gap-1">
                                        {col.label}
                                        {col.sortable && (
                                            <SortIndicator
                                                active={sortConfig.key === col.key}
                                                direction={sortConfig.direction}
                                            />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {incidents.map((incident) => (
                            <IncidentRow
                                key={incident.id}
                                incident={incident}
                                onViewReasoning={onViewReasoning}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
