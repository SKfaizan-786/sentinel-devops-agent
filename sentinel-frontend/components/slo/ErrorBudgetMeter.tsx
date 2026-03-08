"use client";

import { motion } from "framer-motion";

interface ErrorBudgetMeterProps {
    budgetPercent: number;
    remainingMinutes: number;
    allowedMinutes: number;
    size?: "sm" | "md" | "lg";
}

export function ErrorBudgetMeter({
    budgetPercent,
    remainingMinutes,
    allowedMinutes,
    size = "md",
}: ErrorBudgetMeterProps) {
    const clampedPercent = Math.max(0, Math.min(100, budgetPercent));

    // Determine color based on budget remaining
    const getColor = () => {
        if (clampedPercent <= 0) return { stroke: "#ef4444", bg: "rgba(239,68,68,0.1)", text: "text-red-500" };
        if (clampedPercent <= 25) return { stroke: "#ef4444", bg: "rgba(239,68,68,0.1)", text: "text-red-400" };
        if (clampedPercent <= 50) return { stroke: "#f59e0b", bg: "rgba(245,158,11,0.1)", text: "text-amber-400" };
        return { stroke: "#22c55e", bg: "rgba(34,197,94,0.1)", text: "text-emerald-400" };
    };

    const color = getColor();

    const dimensions = {
        sm: { size: 80, strokeWidth: 6, fontSize: "text-sm", labelSize: "text-[9px]" },
        md: { size: 120, strokeWidth: 8, fontSize: "text-xl", labelSize: "text-[10px]" },
        lg: { size: 160, strokeWidth: 10, fontSize: "text-2xl", labelSize: "text-xs" },
    };

    const dim = dimensions[size];
    const radius = (dim.size - dim.strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (clampedPercent / 100) * circumference;

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: dim.size, height: dim.size }}>
                <svg
                    width={dim.size}
                    height={dim.size}
                    viewBox={`0 0 ${dim.size} ${dim.size}`}
                    className="-rotate-90"
                >
                    {/* Background circle */}
                    <circle
                        cx={dim.size / 2}
                        cy={dim.size / 2}
                        r={radius}
                        fill="none"
                        stroke="rgba(255,255,255,0.08)"
                        strokeWidth={dim.strokeWidth}
                    />
                    {/* Progress circle */}
                    <motion.circle
                        cx={dim.size / 2}
                        cy={dim.size / 2}
                        r={radius}
                        fill="none"
                        stroke={color.stroke}
                        strokeWidth={dim.strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={circumference}
                        initial={{ strokeDashoffset: circumference }}
                        animate={{ strokeDashoffset }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                        className={`font-bold font-mono ${dim.fontSize} ${color.text}`}
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3, duration: 0.5 }}
                    >
                        {Math.round(clampedPercent)}%
                    </motion.span>
                    <span className={`${dim.labelSize} text-muted-foreground uppercase tracking-wider`}>
                        budget
                    </span>
                </div>
            </div>

            {/* Remaining time label */}
            <div className="text-center">
                <p className={`${dim.labelSize} text-muted-foreground`}>
                    <span className={`font-mono font-medium ${color.text}`}>{remainingMinutes.toFixed(1)}m</span>
                    {" / "}
                    <span className="font-mono">{allowedMinutes.toFixed(1)}m</span>
                </p>
            </div>

            {/* Critical warning */}
            {clampedPercent <= 25 && clampedPercent > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/10 border border-red-500/20"
                >
                    <span className="text-[10px] text-red-400 font-medium">⚠️ Budget Critical</span>
                </motion.div>
            )}

            {clampedPercent <= 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30"
                >
                    <span className="text-[10px] text-red-400 font-bold">🚨 Budget Exhausted</span>
                </motion.div>
            )}
        </div>
    );
}
