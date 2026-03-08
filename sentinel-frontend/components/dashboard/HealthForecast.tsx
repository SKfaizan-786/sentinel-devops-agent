"use client";

import { motion } from "framer-motion";
import { usePredictions, Prediction } from "@/hooks/usePredictions";

function TrendIcon({ trend }: { trend: string }) {
    if (trend === "rising") return <span className="text-red-400 text-lg">↑</span>;
    if (trend === "falling") return <span className="text-emerald-400 text-lg">↓</span>;
    return <span className="text-slate-400 text-lg">→</span>;
}

function ProbabilityBar({ value }: { value: number }) {
    const pct = Math.round(value * 100);
    const color =
        value >= 0.75 ? "bg-red-500" : value >= 0.5 ? "bg-amber-500" : "bg-emerald-500";

    const glow =
        value >= 0.75
            ? "shadow-[0_0_12px_rgba(239,68,68,0.5)]"
            : value >= 0.5
                ? "shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                : "";

    return (
        <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-2.5 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                    className={`h-full rounded-full ${color} ${glow}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                />
            </div>
            <span className={`text-sm font-mono font-bold min-w-[3ch] ${value >= 0.75 ? "text-red-400" : value >= 0.5 ? "text-amber-400" : "text-emerald-400"
                }`}>
                {pct}%
            </span>
        </div>
    );
}

function PredictionCard({ prediction }: { prediction: Prediction }) {
    const isScaleRecommended = prediction.recommendation === "scale-out";

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl border p-4 transition-all duration-300 ${isScaleRecommended
                ? "border-red-500/30 bg-red-500/5 hover:border-red-500/50"
                : "border-white/10 bg-white/[0.02] hover:border-white/20"
                }`}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <div
                        className={`w-2 h-2 rounded-full ${isScaleRecommended
                            ? "bg-red-500 animate-pulse"
                            : "bg-emerald-500"
                            }`}
                    />
                    <h4 className="text-sm font-semibold text-white capitalize">
                        {prediction.containerName}
                    </h4>
                </div>
                <div className="flex items-center gap-1.5">
                    <TrendIcon trend={prediction.trend} />
                    {isScaleRecommended && (
                        <span className="text-[10px] uppercase tracking-wider font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
                            Scale Out
                        </span>
                    )}
                </div>
            </div>

            <ProbabilityBar value={prediction.failureProbability} />

            {/* Metric Chips */}
            <div className="flex gap-2 mt-3 flex-wrap">
                <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                    CPU: {prediction.metrics.cpuAvg}%
                </span>
                <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                    MEM: {prediction.metrics.memAvg}%
                </span>
                <span className="text-[11px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-md">
                    Samples: {prediction.metrics.samples}
                </span>
            </div>

            {/* Reasons */}
            {prediction.reasons.length > 0 && (
                <div className="mt-3 space-y-1">
                    {prediction.reasons.slice(0, 3).map((reason, i) => (
                        <p key={i} className="text-[11px] text-slate-500 flex items-start gap-1.5">
                            <span className="text-amber-500/60 mt-0.5">•</span>
                            {reason}
                        </p>
                    ))}
                </div>
            )}

            {/* AI Reasoning */}
            {prediction.aiReasoning && (
                <div className="mt-3 pt-3 border-t border-white/5">
                    <p className="text-[11px] text-purple-300/70 italic">
                        🤖 {prediction.aiReasoning}
                    </p>
                </div>
            )}
        </motion.div>
    );
}

export function HealthForecast() {
    const { predictions, loading, lastEvaluated } = usePredictions();

    if (loading) {
        return (
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 animate-pulse">
                <div className="h-6 bg-white/10 rounded w-48 mb-4" />
                <div className="space-y-3">
                    <div className="h-24 bg-white/5 rounded-xl" />
                    <div className="h-24 bg-white/5 rounded-xl" />
                </div>
            </div>
        );
    }

    const criticalCount = predictions.filter((p) => p.failureProbability >= 0.75).length;
    const sortedPredictions = [...predictions].sort(
        (a, b) => b.failureProbability - a.failureProbability
    );

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="rounded-2xl border border-white/10 bg-white/[0.02] p-6"
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                        <span className="text-xl">🔮</span>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">
                            System Health Forecast
                        </h3>
                        <p className="text-xs text-slate-500">
                            Predictive failure analysis
                            {lastEvaluated &&
                                ` • Updated ${new Date(lastEvaluated).toLocaleTimeString()}`}
                        </p>
                    </div>
                </div>
                {criticalCount > 0 && (
                    <div className="flex items-center gap-2 bg-red-500/10 text-red-400 text-xs font-bold px-3 py-1.5 rounded-full">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        {criticalCount} Critical
                    </div>
                )}
            </div>

            {/* Predictions Grid */}
            {sortedPredictions.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-slate-500 text-sm">
                        No container data available yet. Predictions will appear once metrics
                        are collected.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {sortedPredictions.map((prediction) => (
                        <PredictionCard
                            key={prediction.containerId}
                            prediction={prediction}
                        />
                    ))}
                </div>
            )}
        </motion.div>
    );
}
