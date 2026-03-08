'use client';

import { motion } from 'framer-motion';
import { Check, X, ArrowDown, Loader2 } from 'lucide-react';
import { useState } from 'react';
import type { FinOpsRecommendation } from '@/hooks/useFinOps';

interface RightSizingTableProps {
    recommendations: FinOpsRecommendation[];
    loading?: boolean;
    onApply: (id: number) => Promise<void>;
    onDismiss: (id: number) => Promise<void>;
}

function StatusBadge({ status }: { status: string }) {
    const styles: Record<string, string> = {
        pending: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        applied: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
        dismissed: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
    };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.pending}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

export function RightSizingTable({ recommendations, loading, onApply, onDismiss }: RightSizingTableProps) {
    const [actionLoading, setActionLoading] = useState<Record<number, string>>({});

    const handleAction = async (id: number, action: 'apply' | 'dismiss') => {
        setActionLoading(prev => ({ ...prev, [id]: action }));
        try {
            if (action === 'apply') {
                await onApply(id);
            } else {
                await onDismiss(id);
            }
        } finally {
            setActionLoading(prev => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }
    };

    if (loading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-56 mb-4" />
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                        <div key={i} className="h-14 bg-white/5 rounded" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="glass-card p-6"
        >
            <h3 className="text-lg font-semibold mb-4">Right-Sizing Recommendations</h3>

            {recommendations.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                    <p>No recommendations yet. Run an analysis to generate recommendations.</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm" id="finops-recommendations-table">
                        <thead>
                            <tr className="border-b border-white/10">
                                <th className="text-left py-3 px-3 text-muted-foreground font-medium">Container</th>
                                <th className="text-right py-3 px-3 text-muted-foreground font-medium">Current</th>
                                <th className="text-center py-3 px-3 text-muted-foreground font-medium" />
                                <th className="text-right py-3 px-3 text-muted-foreground font-medium">Recommended</th>
                                <th className="text-right py-3 px-3 text-muted-foreground font-medium">Savings</th>
                                <th className="text-center py-3 px-3 text-muted-foreground font-medium">Status</th>
                                <th className="text-right py-3 px-3 text-muted-foreground font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recommendations.map((rec, index) => (
                                <motion.tr
                                    key={rec.id}
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.05 * index, duration: 0.3 }}
                                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                >
                                    <td className="py-3 px-3">
                                        <div>
                                            <p className="font-medium truncate max-w-[200px]" title={rec.container_name}>
                                                {rec.container_name.replace(/^\//, '')}
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]" title={rec.reasoning}>
                                                {rec.reasoning}
                                            </p>
                                        </div>
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-muted-foreground">
                                        {rec.current_memory_limit_mb} MB
                                    </td>
                                    <td className="py-3 px-1 text-center">
                                        <ArrowDown className="h-4 w-4 text-emerald-400 mx-auto" />
                                    </td>
                                    <td className="py-3 px-3 text-right font-mono text-emerald-400 font-medium">
                                        {rec.recommended_memory_limit_mb} MB
                                    </td>
                                    <td className="py-3 px-3 text-right font-medium text-emerald-400">
                                        ${Number(rec.estimated_savings_monthly).toFixed(2)}/mo
                                    </td>
                                    <td className="py-3 px-3 text-center">
                                        <StatusBadge status={rec.status} />
                                    </td>
                                    <td className="py-3 px-3 text-right">
                                        {rec.status === 'pending' && (
                                            <div className="flex items-center gap-1.5 justify-end">
                                                <button
                                                    id={`apply-rec-${rec.id}`}
                                                    onClick={() => handleAction(rec.id, 'apply')}
                                                    disabled={!!actionLoading[rec.id]}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30 transition-all text-xs font-medium disabled:opacity-50"
                                                    title="Apply this recommendation"
                                                >
                                                    {actionLoading[rec.id] === 'apply' ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <Check className="h-3 w-3" />
                                                    )}
                                                    Apply
                                                </button>
                                                <button
                                                    id={`dismiss-rec-${rec.id}`}
                                                    onClick={() => handleAction(rec.id, 'dismiss')}
                                                    disabled={!!actionLoading[rec.id]}
                                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-zinc-500/15 text-zinc-400 hover:bg-zinc-500/25 border border-zinc-500/30 transition-all text-xs font-medium disabled:opacity-50"
                                                    title="Dismiss this recommendation"
                                                >
                                                    {actionLoading[rec.id] === 'dismiss' ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : (
                                                        <X className="h-3 w-3" />
                                                    )}
                                                    Dismiss
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </motion.div>
    );
}
