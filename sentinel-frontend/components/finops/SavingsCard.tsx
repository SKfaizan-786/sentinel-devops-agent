'use client';

import { motion } from 'framer-motion';
import { DollarSign, TrendingDown, AlertTriangle, Container } from 'lucide-react';
import type { FinOpsSummary } from '@/hooks/useFinOps';

interface SavingsCardProps {
    summary: FinOpsSummary | null;
    loading?: boolean;
}

interface StatCardProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    subtext?: string;
    gradient: string;
    delay: number;
}

function StatCard({ icon, label, value, subtext, gradient, delay }: StatCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: 'easeOut' }}
            className="glass-card p-6 relative overflow-hidden group"
        >
            {/* Gradient accent */}
            <div
                className="absolute top-0 left-0 right-0 h-1 opacity-80"
                style={{ background: gradient }}
            />

            <div className="flex items-start justify-between">
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground font-medium">{label}</p>
                    <motion.p
                        className="text-3xl font-bold tracking-tight"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: delay + 0.2, duration: 0.6 }}
                    >
                        {value}
                    </motion.p>
                    {subtext && (
                        <p className="text-xs text-muted-foreground">{subtext}</p>
                    )}
                </div>
                <div
                    className="p-3 rounded-xl bg-white/10"
                    style={{ backgroundImage: gradient.replace('to right,', '135deg,') }}
                >
                    {icon}
                </div>
            </div>
        </motion.div>
    );
}

export function SavingsCard({ summary, loading }: SavingsCardProps) {
    if (loading || !summary) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="glass-card p-6 animate-pulse">
                        <div className="h-4 bg-white/10 rounded w-24 mb-3" />
                        <div className="h-8 bg-white/10 rounded w-32" />
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
                icon={<DollarSign className="h-6 w-6 text-emerald-400" />}
                label="Potential Savings"
                value={`$${summary.potentialSavingsMonthly.toFixed(2)}/mo`}
                subtext={`${summary.pendingRecommendations} pending recommendations`}
                gradient="linear-gradient(to right, #10b981, #34d399)"
                delay={0}
            />
            <StatCard
                icon={<TrendingDown className="h-6 w-6 text-cyan-400" />}
                label="Realized Savings"
                value={`$${summary.realizedSavingsMonthly.toFixed(2)}/mo`}
                subtext={`${summary.appliedRecommendations} applied`}
                gradient="linear-gradient(to right, #06b6d4, #22d3ee)"
                delay={0.1}
            />
            <StatCard
                icon={<AlertTriangle className="h-6 w-6 text-amber-400" />}
                label="Resource Waste"
                value={`${summary.wastePercentage.toFixed(1)}%`}
                subtext={`Avg utilization: ${summary.avgResourceUtilization.toFixed(1)}%`}
                gradient="linear-gradient(to right, #f59e0b, #fbbf24)"
                delay={0.2}
            />
            <StatCard
                icon={<Container className="h-6 w-6 text-violet-400" />}
                label="Monitored Containers"
                value={`${summary.monitoredContainers}`}
                subtext="Tracked in last 24h"
                gradient="linear-gradient(to right, #8b5cf6, #a78bfa)"
                delay={0.3}
            />
        </div>
    );
}
