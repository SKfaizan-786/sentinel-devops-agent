"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Target,
    Shield,
    AlertTriangle,
    CheckCircle2,
    Plus,
    RefreshCw,
    TrendingDown,
    Clock,
    ChevronLeft,
} from "lucide-react";
import { useSLO } from "@/hooks/useSLO";
import type { SLODetail } from "@/hooks/useSLO";
import { SLOCard } from "@/components/slo/SLOCard";
import { SLOChart } from "@/components/slo/SLOChart";
import { ErrorBudgetMeter } from "@/components/slo/ErrorBudgetMeter";
import { CreateSLOModal } from "@/components/slo/CreateSLOModal";

export default function SLODashboardPage() {
    const { slos, summary, loading, error, refresh, fetchSLODetail, createSLO, deleteSLO } = useSLO();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [detail, setDetail] = useState<SLODetail | null>(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Fetch detail when selection changes
    useEffect(() => {
        if (!selectedId) {
            setDetail(null);
            return;
        }
        setDetailLoading(true);
        fetchSLODetail(selectedId).then((d) => {
            setDetail(d);
            setDetailLoading(false);
        });
    }, [selectedId, fetchSLODetail]);

    const handleRefresh = async () => {
        setRefreshing(true);
        await refresh();
        if (selectedId) {
            const d = await fetchSLODetail(selectedId);
            setDetail(d);
        }
        setTimeout(() => setRefreshing(false), 500);
    };

    const handleDelete = async (id: string) => {
        await deleteSLO(id);
        if (selectedId === id) {
            setSelectedId(null);
            setDetail(null);
        }
    };

    if (loading) {
        return (
            <div className="p-6 lg:p-8">
                <div className="animate-pulse space-y-6">
                    <div className="h-8 w-64 bg-white/5 rounded-lg" />
                    <div className="grid grid-cols-4 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-24 bg-white/5 rounded-xl" />
                        ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="h-48 bg-white/5 rounded-xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
                            <Target className="h-6 w-6 text-primary" />
                        </div>
                        SLO Tracker
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track error budgets and SLO compliance across your services
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleRefresh}
                        className="p-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
                    >
                        <Plus className="h-4 w-4" />
                        Define SLO
                    </button>
                </div>
            </div>

            {/* Error banner */}
            {error && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    ⚠️ {error} — Data may be stale. Is the backend running?
                </div>
            )}

            {/* Summary Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0 }}
                    className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Shield className="h-4 w-4 text-blue-400" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Total SLOs</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-foreground">{summary.total}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 backdrop-blur-sm"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Healthy</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-emerald-400">{summary.healthy}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-sm"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-4 w-4 text-amber-400" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Warning</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-amber-400">{summary.warning}</p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="p-4 rounded-xl border border-red-500/20 bg-red-500/5 backdrop-blur-sm"
                >
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <span className="text-xs text-muted-foreground uppercase tracking-wider">Critical</span>
                    </div>
                    <p className="text-2xl font-bold font-mono text-red-400">{summary.critical}</p>
                </motion.div>
            </div>

            {/* Main Content: Cards + Detail Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* SLO Cards Grid */}
                <div className={`${selectedId ? "lg:col-span-1" : "lg:col-span-3"}`}>
                    <div className={`grid gap-4 ${selectedId ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
                        {slos.length === 0 ? (
                            <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
                                <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                <h3 className="text-lg font-medium text-muted-foreground mb-2">No SLOs Defined</h3>
                                <p className="text-sm text-muted-foreground/70 mb-4">
                                    Start tracking your service reliability by defining an SLO
                                </p>
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
                                >
                                    <Plus className="h-4 w-4" />
                                    Define your first SLO
                                </button>
                            </div>
                        ) : (
                            slos.map((slo) => (
                                <SLOCard
                                    key={slo.id}
                                    slo={slo}
                                    onSelect={setSelectedId}
                                    isSelected={selectedId === slo.id}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Detail Panel */}
                <AnimatePresence mode="wait">
                    {selectedId && (
                        <motion.div
                            key={selectedId}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="lg:col-span-2 space-y-4"
                        >
                            {detailLoading ? (
                                <div className="animate-pulse space-y-4">
                                    <div className="h-8 w-48 bg-white/5 rounded" />
                                    <div className="h-[250px] bg-white/5 rounded-xl" />
                                    <div className="h-32 bg-white/5 rounded-xl" />
                                </div>
                            ) : detail ? (
                                <>
                                    {/* Detail Header */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <button
                                                onClick={() => setSelectedId(null)}
                                                className="p-1.5 rounded-lg hover:bg-white/10 text-muted-foreground lg:hidden"
                                            >
                                                <ChevronLeft className="h-4 w-4" />
                                            </button>
                                            <div>
                                                <h2 className="text-lg font-semibold text-foreground">
                                                    {detail.serviceName}
                                                </h2>
                                                <p className="text-xs text-muted-foreground">
                                                    SLO: {detail.targetAvailability}% · Window:{" "}
                                                    {detail.trackingWindow === "1day"
                                                        ? "24h"
                                                        : detail.trackingWindow === "7days"
                                                            ? "7 days"
                                                            : "30 days"}
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(detail.id)}
                                            className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded-lg hover:bg-red-500/10 transition-all"
                                        >
                                            Remove SLO
                                        </button>
                                    </div>

                                    {/* Error Budget + Stats */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="flex items-center justify-center p-6 rounded-xl border border-white/10 bg-white/5">
                                            <ErrorBudgetMeter
                                                budgetPercent={detail.budget.budgetPercent}
                                                remainingMinutes={detail.budget.remainingMinutes}
                                                allowedMinutes={detail.budget.allowedDowntimeMinutes}
                                                size="lg"
                                            />
                                        </div>
                                        <div className="md:col-span-2 grid grid-cols-2 gap-3">
                                            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                                    Current Availability
                                                </p>
                                                <p
                                                    className={`text-xl font-bold font-mono ${detail.budget.currentAvailability >= detail.targetAvailability
                                                            ? "text-emerald-400"
                                                            : "text-red-400"
                                                        }`}
                                                >
                                                    {detail.budget.currentAvailability}%
                                                </p>
                                            </div>
                                            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                                    Target
                                                </p>
                                                <p className="text-xl font-bold font-mono text-foreground">
                                                    {detail.targetAvailability}%
                                                </p>
                                            </div>
                                            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                                    Downtime Used
                                                </p>
                                                <p className="text-xl font-bold font-mono text-foreground">
                                                    {detail.budget.usedDowntimeMinutes}m
                                                </p>
                                            </div>
                                            <div className="p-4 rounded-xl border border-white/10 bg-white/5">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">
                                                    Incidents
                                                </p>
                                                <p className="text-xl font-bold font-mono text-foreground">
                                                    {detail.budget.incidentCount}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Burndown Chart */}
                                    <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                                        <div className="flex items-center gap-2 mb-4">
                                            <TrendingDown className="h-4 w-4 text-muted-foreground" />
                                            <h3 className="text-sm font-semibold text-foreground">Error Budget Burndown</h3>
                                        </div>
                                        <SLOChart
                                            data={detail.burndown}
                                            alertThreshold={detail.alertThreshold * 100}
                                        />
                                    </div>

                                    {/* Recent Incidents */}
                                    {detail.incidents && detail.incidents.length > 0 && (
                                        <div className="p-5 rounded-xl border border-white/10 bg-white/5">
                                            <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                                                Recent Downtime Events
                                            </h3>
                                            <div className="space-y-2">
                                                {detail.incidents.slice(0, 10).map((inc) => (
                                                    <div
                                                        key={inc.id}
                                                        className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5"
                                                    >
                                                        <div>
                                                            <p className="text-sm text-foreground">
                                                                {inc.description || "Downtime event"}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground font-mono">
                                                                {new Date(inc.resolvedAt).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <span className="text-sm font-mono text-red-400">
                                                            -{inc.downtimeMinutes}m
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Projected Exhaustion */}
                                    {detail.budget.projectedExhaustionDate && detail.budget.status !== "exhausted" && (
                                        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-amber-400" />
                                                <p className="text-sm text-amber-400">
                                                    At current burn rate, error budget will exhaust on{" "}
                                                    <span className="font-bold font-mono">
                                                        {new Date(detail.budget.projectedExhaustionDate).toLocaleDateString(
                                                            "en-US",
                                                            { month: "long", day: "numeric", year: "numeric" }
                                                        )}
                                                    </span>
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground p-8 text-center">
                                    Failed to load SLO details
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Create SLO Modal */}
            <CreateSLOModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                onCreate={createSLO}
            />
        </div>
    );
}
