"use client";

import { useId } from "react";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import type { BurndownPoint } from "@/hooks/useSLO";

interface SLOChartProps {
    data: BurndownPoint[];
    alertThreshold?: number;
    className?: string;
}

export function SLOChart({ data, alertThreshold = 25, className = "" }: SLOChartProps) {
    // Per-instance gradient ID to avoid SVG <defs> collision when
    // multiple SLOChart components are rendered on the same page.
    const instanceId = useId();
    const gradientId = `budgetGradient-${instanceId.replace(/:/g, "")}`;

    if (!data || data.length === 0) {
        return (
            <div className={`flex items-center justify-center h-[250px] text-muted-foreground text-sm ${className}`}>
                No burndown data available
            </div>
        );
    }

    const formattedData = data.map((point) => ({
        ...point,
        time: new Date(point.timestamp).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        }),
        fullTime: new Date(point.timestamp).toLocaleString(),
    }));

    // Determine the gradient color based on the latest budget percentage
    const latestBudget = data[data.length - 1]?.budgetPercent ?? 100;
    const gradientColor =
        latestBudget <= 25 ? "#ef4444" : latestBudget <= 50 ? "#f59e0b" : "#22c55e";

    const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { fullTime: string; budgetPercent: number; usedMinutes: number } }> }) => {
        if (!active || !payload || !payload.length) return null;
        const d = payload[0].payload;
        return (
            <div className="bg-card/95 backdrop-blur-sm border border-white/10 rounded-lg p-3 shadow-xl">
                <p className="text-xs text-muted-foreground mb-1">{d.fullTime}</p>
                <p className="text-sm font-mono">
                    Budget:{" "}
                    <span
                        className={`font-bold ${d.budgetPercent <= 25
                            ? "text-red-400"
                            : d.budgetPercent <= 50
                                ? "text-amber-400"
                                : "text-emerald-400"
                            }`}
                    >
                        {d.budgetPercent}%
                    </span>
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                    Used: {d.usedMinutes}m downtime
                </p>
            </div>
        );
    };

    return (
        <div className={`w-full ${className}`}>
            <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={gradientColor} stopOpacity={0.3} />
                            <stop offset="95%" stopColor={gradientColor} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>

                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis
                        dataKey="time"
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        tickLine={false}
                    />
                    <YAxis
                        domain={[0, 100]}
                        tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                        axisLine={{ stroke: "rgba(255,255,255,0.1)" }}
                        tickLine={false}
                        tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Alert threshold reference line */}
                    <ReferenceLine
                        y={alertThreshold}
                        stroke="#ef4444"
                        strokeDasharray="6 4"
                        strokeOpacity={0.6}
                        label={{
                            value: `Alert ${alertThreshold}%`,
                            position: "insideRight",
                            fill: "#ef4444",
                            fontSize: 10,
                        }}
                    />

                    <Area
                        type="monotone"
                        dataKey="budgetPercent"
                        stroke={gradientColor}
                        strokeWidth={2}
                        fill={`url(#${gradientId})`}
                        animationDuration={1500}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
}
