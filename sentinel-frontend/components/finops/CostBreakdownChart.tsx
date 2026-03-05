'use client';

import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { HeatmapEntry } from '@/hooks/useFinOps';

interface CostBreakdownChartProps {
    data: HeatmapEntry[];
    loading?: boolean;
}

const COLORS = [
    'hsl(250, 80%, 60%)',   // chart-1 purple
    'hsl(162, 60%, 50%)',   // chart-2 teal
    'hsl(40, 80%, 55%)',    // chart-3 amber
    'hsl(290, 60%, 55%)',   // chart-4 violet
    'hsl(10, 70%, 55%)',    // chart-5 coral
    'hsl(200, 70%, 55%)',   // cyan
    'hsl(130, 50%, 50%)',   // green
    'hsl(330, 60%, 55%)',   // pink
];

interface CustomTooltipProps {
    active?: boolean;
    payload?: Array<{
        name: string;
        value: number;
        payload: {
            name: string;
            allocated: number;
            used: number;
        };
    }>;
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
        <div className="bg-background/95 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-xl">
            <p className="text-sm font-medium mb-1">{data.name}</p>
            <p className="text-xs text-muted-foreground">
                Allocated: <span className="text-foreground font-medium">{data.allocated} MB</span>
            </p>
            <p className="text-xs text-muted-foreground">
                Used: <span className="text-foreground font-medium">{data.used} MB</span>
            </p>
        </div>
    );
}

export function CostBreakdownChart({ data, loading }: CostBreakdownChartProps) {
    if (loading) {
        return (
            <div className="glass-card p-6 animate-pulse">
                <div className="h-5 bg-white/10 rounded w-40 mb-4" />
                <div className="h-64 bg-white/5 rounded" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold mb-4">Cost Breakdown by Service</h3>
                <div className="flex items-center justify-center h-48 text-muted-foreground">
                    <p>No data available yet.</p>
                </div>
            </div>
        );
    }

    const chartData = data.map(entry => ({
        name: entry.container_name.replace(/^\//, '').replace(/-/g, ' '),
        allocated: Number(entry.avg_limit_mb),
        used: Number(entry.avg_memory_mb),
        value: Number(entry.avg_limit_mb),
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="glass-card p-6"
        >
            <h3 className="text-lg font-semibold mb-4">Memory Allocation by Service</h3>

            <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                            animationBegin={300}
                            animationDuration={800}
                        >
                            {chartData.map((_, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    stroke="transparent"
                                />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            formatter={(value: string) => (
                                <span className="text-xs text-muted-foreground capitalize">{value}</span>
                            )}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </motion.div>
    );
}
