"use client";

import { motion } from "framer-motion";
import { Target, Clock, TrendingDown, AlertTriangle } from "lucide-react";
import { ErrorBudgetMeter } from "./ErrorBudgetMeter";
import type { SLODefinition } from "@/hooks/useSLO";

interface SLOCardProps {
    slo: SLODefinition;
    onSelect: (id: string) => void;
    isSelected: boolean;
}

const windowLabels: Record<string, string> = {
    "1day": "24h",
    "7days": "7d",
    "1month": "30d",
};

const statusConfig: Record<string, { bg: string; border: string; badge: string; label: string }> = {
    healthy: {
        bg: "bg-emerald-500/5",
        border: "border-emerald-500/20 hover:border-emerald-500/40",
        badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        label: "On Track",
    },
    warning: {
        bg: "bg-amber-500/5",
        border: "border-amber-500/20 hover:border-amber-500/40",
        badge: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        label: "Warning",
    },
    critical: {
        bg: "bg-red-500/5",
        border: "border-red-500/20 hover:border-red-500/40",
        badge: "bg-red-500/10 text-red-400 border-red-500/20",
        label: "Critical",
    },
    exhausted: {
        bg: "bg-red-500/10",
        border: "border-red-500/30 hover:border-red-500/50",
        badge: "bg-red-500/20 text-red-300 border-red-500/30",
        label: "Exhausted",
    },
};

export function SLOCard({ slo, onSelect, isSelected }: SLOCardProps) {
    const { budget } = slo;
    const status = statusConfig[budget.status] || statusConfig.healthy;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            onClick={() => onSelect(slo.id)}
            className={`
        relative p-5 rounded-xl border backdrop-blur-sm cursor-pointer
        transition-all duration-300 group
        ${status.bg} ${status.border}
        ${isSelected ? "ring-2 ring-primary/50 shadow-lg shadow-primary/5" : ""}
      `}
        >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                        <h3 className="text-sm font-semibold text-foreground truncate">
                            {slo.serviceName}
                        </h3>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${status.badge}`}
                        >
                            {budget.status === "critical" || budget.status === "exhausted" ? (
                                <AlertTriangle className="h-3 w-3 mr-1" />
                            ) : null}
                            {status.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                            {windowLabels[slo.trackingWindow] || slo.trackingWindow}
                        </span>
                    </div>
                </div>

                {/* Error Budget Meter */}
                <ErrorBudgetMeter
                    budgetPercent={budget.budgetPercent}
                    remainingMinutes={budget.remainingMinutes}
                    allowedMinutes={budget.allowedDowntimeMinutes}
                    size="sm"
                />
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-1 mb-1">
                        <Target className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Target</span>
                    </div>
                    <p className="text-sm font-mono font-medium text-foreground">
                        {slo.targetAvailability}%
                    </p>
                </div>

                <div className="p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-1 mb-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Current</span>
                    </div>
                    <p
                        className={`text-sm font-mono font-medium ${budget.currentAvailability >= slo.targetAvailability
                                ? "text-emerald-400"
                                : "text-red-400"
                            }`}
                    >
                        {budget.currentAvailability}%
                    </p>
                </div>

                <div className="p-2 rounded-lg bg-white/5">
                    <div className="flex items-center gap-1 mb-1">
                        <TrendingDown className="h-3 w-3 text-muted-foreground" />
                        <span className="text-[9px] text-muted-foreground uppercase tracking-wider">Burn/Day</span>
                    </div>
                    <p className="text-sm font-mono font-medium text-foreground">
                        {budget.burndownRatePerDay}%
                    </p>
                </div>
            </div>

            {/* Projected Exhaustion */}
            {budget.projectedExhaustionDate && budget.status !== "exhausted" && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[10px] text-muted-foreground">
                        Projected exhaustion:{" "}
                        <span className="font-mono text-foreground">
                            {new Date(budget.projectedExhaustionDate).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                            })}
                        </span>
                    </p>
                </div>
            )}
        </motion.div>
    );
}
