"use client";

import { useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { ServiceMetrics } from "@/hooks/useMetrics";

interface MetricsChartsProps {
    metrics: Record<string, ServiceMetrics>;
}

export function MetricsCharts({ metrics }: MetricsChartsProps) {
    const [timeRange, setTimeRange] = useState<"1h" | "6h" | "24h">("1h");
    const [activeTab, setActiveTab] = useState<"response" | "error" | "resources">("response");

    // Transform metrics dictionary into array for charting if needed
    // But for multi-line charts, we usually iterate over the keys to create multiple Lines
    const serviceIds = Object.keys(metrics);

    // Helper to get color for service
    const getServiceColor = (id: string) => {
        // If service is down, line becomes RED
        if (metrics[id] && metrics[id].currentErrorRate > 0.5) return "#ef4444";

        switch (id) {
            case "api-gateway": return "#22d3ee"; // Cyan
            case "auth-service": return "#818cf8"; // Indigo
            case "notification-service": return "#f472b6"; // Pink (was missing)
            case "payment-service": return "#34d399"; // Emerald (was key mismatch)
            default: return "#94a3b8";
        }
    };

    // Prepare data for the charts
    // ... (keep existing data prep)
    const referenceService = serviceIds[0];
    const referenceHistory = referenceService ? metrics[referenceService]?.history : [];

    const chartData = referenceHistory?.map((point, index) => {
        const combinedPoint: Record<string, string | number> = { timestamp: point.timestamp };
        serviceIds.forEach(id => {
            const historyPoint = metrics[id]?.history[index];
            if (historyPoint) {
                combinedPoint[`${id}_response`] = historyPoint.responseTime;
                combinedPoint[`${id}_error`] = historyPoint.errorRate;
                combinedPoint[`${id}_cpu`] = historyPoint.cpu;
            }
        });
        return combinedPoint;
    }) || [];

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-foreground">System Metrics</h3>
                <div className="flex bg-muted rounded-lg p-1 border border-border">
                    {(["1h", "6h", "24h"] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${timeRange === range
                                ? "bg-primary/20 text-primary shadow-sm"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex space-x-4 border-b border-border pb-2">
                <button
                    onClick={() => setActiveTab("response")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "response"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Response Time (ms)
                </button>
                <button
                    onClick={() => setActiveTab("error")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "error"
                        ? "border-destructive text-destructive"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Error Rate (%)
                </button>
                <button
                    onClick={() => setActiveTab("resources")}
                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === "resources"
                        ? "border-secondary text-secondary-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                >
                    CPU Usage (%)
                </button>
            </div>

            {/* Chart Container */}
            <div className="h-[300px] w-full bg-card backdrop-blur-sm border border-border rounded-xl p-4 shadow-xl">
                <ResponsiveContainer width="100%" height="100%">
                    {activeTab === "resources" ? (
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis
                                dataKey="timestamp"
                                stroke="var(--muted-foreground)"
                                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                                tickLine={false}
                            />
                            <YAxis
                                stroke="var(--muted-foreground)"
                                tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                                tickLine={false}
                            />
                            <Tooltip
                                shared={false}
                                contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", color: "var(--popover-foreground)" }}
                                itemStyle={{ color: "var(--popover-foreground)" }}
                            />
                            {serviceIds.map((id) => (
                                <Line
                                    key={id}
                                    type="monotone"
                                    dataKey={`${id}_cpu`}
                                    name={metrics[id].name}
                                    stroke={getServiceColor(id)}
                                    strokeWidth={metrics[id]?.currentErrorRate > 0.5 ? 4 : 2}
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    ) : activeTab === "error" ? (
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="timestamp" stroke="var(--muted-foreground)" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} />
                            <YAxis stroke="var(--muted-foreground)" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} />
                            <Tooltip
                                shared={false}
                                contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", color: "var(--popover-foreground)" }}
                            />
                            {serviceIds.map((id) => (
                                <Line
                                    key={id}
                                    type="monotone"
                                    dataKey={`${id}_error`}
                                    name={metrics[id].name}
                                    stroke={getServiceColor(id)}
                                    strokeWidth={metrics[id]?.currentErrorRate > 0.5 ? 4 : 2}
                                    dot={false}
                                />
                            ))}
                        </LineChart>
                    ) : (
                        <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                            <XAxis dataKey="timestamp" stroke="var(--muted-foreground)" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} />
                            <YAxis stroke="var(--muted-foreground)" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} tickLine={false} />
                            <Tooltip
                                shared={false}
                                contentStyle={{ backgroundColor: "var(--popover)", borderColor: "var(--border)", color: "var(--popover-foreground)" }}
                            />
                            {serviceIds.map((id) => (
                                <Line
                                    key={id}
                                    type="monotone"
                                    dataKey={`${id}_response`}
                                    name={metrics[id].name}
                                    stroke={getServiceColor(id)}
                                    // Make line thicker if down
                                    strokeWidth={(metrics[id] && metrics[id].currentErrorRate > 0.5) ? 4 : 2}
                                    dot={false}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                />
                            ))}
                        </LineChart>
                    )}
                </ResponsiveContainer>
            </div>

            {/* Custom Legend for better control */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-2">
                {serviceIds.map(id => {
                    const isDown = metrics[id] && metrics[id].currentErrorRate > 0.5;
                    const color = getServiceColor(id);
                    // Guard against missing metrics in legend
                    if (!metrics[id]) return null;
                    return (
                        <div key={id} className="flex items-center gap-2">
                            <span
                                className="h-3 w-3 rounded-full transition-colors"
                                style={{ backgroundColor: color, boxShadow: isDown ? `0 0 8px ${color}` : 'none' }}
                            />
                            <span
                                className={`text-sm font-medium transition-colors ${isDown ? "text-red-400 font-bold" : "text-muted-foreground"}`}
                            >
                                {metrics[id].name}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
