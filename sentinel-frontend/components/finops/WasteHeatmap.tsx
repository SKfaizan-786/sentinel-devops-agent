'use client';

import { motion } from 'framer-motion';
import type { HeatmapEntry } from '@/hooks/useFinOps';

interface WasteHeatmapProps {
    data: HeatmapEntry[];
    loading?: boolean;
}

/**
 * Returns a color based on waste percentage (100 - utilization).
 * Low waste (high utilization) = green, moderate = amber, high waste = red.
 */
function getWasteColor(utilization: number): string {
    if (utilization >= 70) return 'rgba(34, 197, 94, 0.7)';   // green — well utilized
    if (utilization >= 40) return 'rgba(234, 179, 8, 0.7)';    // amber — moderate waste
    if (utilization >= 20) return 'rgba(249, 115, 22, 0.7)';   // orange — significant waste
    return 'rgba(239, 68, 68, 0.7)';                            // red — heavy waste
}

function getWasteLabel(utilization: number): string {
    if (utilization >= 70) return 'Well utilized';
    if (utilization >= 40) return 'Moderate waste';
    if (utilization >= 20) return 'Significant waste';
    return 'Heavy waste';
}

export function WasteHeatmap({ data, loading }: WasteHeatmapProps) {
    if (loading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-40 mb-4" />
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-12 bg-white/5 rounded" />
                    ))}
                </div>
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Resource Waste Heatmap</h3>
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <p>No metric data available yet. Data will appear once containers are monitored.</p>
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="glass-card p-6"
        >
            <h3 className="text-lg font-semibold mb-4">Resource Waste Heatmap</h3>

            {/* Header row */}
            <div className="grid grid-cols-[1fr_120px_120px] gap-2 mb-2 px-2">
                <span className="text-xs text-muted-foreground font-medium">Container</span>
                <span className="text-xs text-muted-foreground font-medium text-center">CPU</span>
                <span className="text-xs text-muted-foreground font-medium text-center">Memory</span>
            </div>

            {/* Heatmap rows */}
            <div className="space-y-2">
                {data.map((entry, index) => (
                    <motion.div
                        key={entry.container_id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * index, duration: 0.3 }}
                        className="grid grid-cols-[1fr_120px_120px] gap-2 items-center px-2"
                    >
                        <span
                            className="text-sm font-medium truncate"
                            title={entry.container_name}
                        >
                            {entry.container_name.replace(/^\//, '')}
                        </span>

                        {/* CPU cell */}
                        <div
                            className="relative rounded-lg h-10 flex items-center justify-center cursor-default transition-all hover:scale-105"
                            style={{ backgroundColor: getWasteColor(Number(entry.avg_cpu)) }}
                            aria-label={`${entry.container_name} CPU: ${entry.avg_cpu}% utilized — ${getWasteLabel(Number(entry.avg_cpu))}`}
                            title={`CPU: ${entry.avg_cpu}% avg utilization\n${getWasteLabel(Number(entry.avg_cpu))}`}
                        >
                            <span className="text-xs font-bold text-white drop-shadow-md">
                                {entry.avg_cpu}%
                            </span>
                        </div>

                        {/* Memory cell */}
                        <div
                            className="relative rounded-lg h-10 flex items-center justify-center cursor-default transition-all hover:scale-105"
                            style={{ backgroundColor: getWasteColor(Number(entry.avg_memory)) }}
                            aria-label={`${entry.container_name} Memory: ${entry.avg_memory}% utilized (${entry.avg_memory_mb}MB / ${entry.avg_limit_mb}MB) — ${getWasteLabel(Number(entry.avg_memory))}`}
                            title={`Memory: ${entry.avg_memory}% avg utilization\n${entry.avg_memory_mb}MB / ${entry.avg_limit_mb}MB\n${getWasteLabel(Number(entry.avg_memory))}`}
                        >
                            <span className="text-xs font-bold text-white drop-shadow-md">
                                {entry.avg_memory}%
                            </span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/5">
                <span className="text-xs text-muted-foreground">Waste Level:</span>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(34, 197, 94, 0.7)' }} />
                    <span className="text-xs text-muted-foreground">Low</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(234, 179, 8, 0.7)' }} />
                    <span className="text-xs text-muted-foreground">Moderate</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(249, 115, 22, 0.7)' }} />
                    <span className="text-xs text-muted-foreground">Significant</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.7)' }} />
                    <span className="text-xs text-muted-foreground">Heavy</span>
                </div>
            </div>
        </motion.div>
    );
}
