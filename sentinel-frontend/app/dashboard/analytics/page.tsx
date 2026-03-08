"use client";

import { useMemo } from "react";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { ResourcesChart } from "@/components/analytics/ResourcesChart";
import { TrafficChart } from "@/components/analytics/TrafficChart";
import { PerformanceTable } from "@/components/analytics/PerformanceTable";
import { useStatus } from "@/hooks/useStatus";
import { Info } from "lucide-react";

export default function AnalyticsPage() {
    const { status } = useStatus();

    // Compute health score from real service data
    const healthScore = useMemo(() => {
        const services = status?.services;
        if (!services || typeof services !== 'object') return 0;

        const entries = Object.values(services);
        if (entries.length === 0) return 0;

        const healthyCount = entries.filter((s: unknown) => {
            if (typeof s === 'string') return s === 'healthy' || s === 'ok';
            if (typeof s === 'object' && s !== null && 'status' in s) {
                const st = (s as { status: string }).status;
                return st === 'healthy' || st === 'ok';
            }
            return false;
        }).length;

        return Math.round((healthyCount / entries.length) * 100);
    }, [status]);

    const scoreColor = healthScore >= 80 ? 'text-green-400' : healthScore >= 50 ? 'text-yellow-400' : 'text-red-400';

    return (
        <div>
            <DashboardHeader />
            <div className="p-4 lg:p-6">
                <div className="container mx-auto max-w-7xl pb-20 space-y-8">
                    <AnalyticsHeader />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Main Resources Chart (2/3 width) */}
                        <div className="md:col-span-2 p-6 bg-white/5 border border-gray-400 rounded-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold">Cluster Resource Usage</h3>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#c084fc]" /> CPU</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#2dd4bf]" /> Memory</span>
                                </div>
                            </div>
                            <ResourcesChart />
                        </div>

                        {/* Scorecard / Stats (1/3 width) */}
                        <div className="space-y-6">
                            <div className="p-6 bg-white/5 border border-gray-400 rounded-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Info className="h-24 w-24" />
                                </div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">System Health Score</h3>
                                <div className="text-5xl font-bold mb-2">{healthScore}<span className="text-2xl text-muted-foreground">/100</span></div>
                                <p className={`text-xs ${scoreColor} flex items-center gap-1`}>
                                    {healthScore >= 80 ? '✓ Systems operating normally' : healthScore >= 50 ? '⚠ Some services degraded' : '✕ Multiple services down'}
                                </p>
                            </div>

                            <div className="p-6 bg-white/5 border border-gray-400 rounded-xl">
                                <h3 className="text-sm font-semibold mb-4">Traffic Volume</h3>
                                <TrafficChart />
                            </div>
                        </div>

                        {/* Performance Table (Full Width or 2/3) */}
                        <div className="md:col-span-2 lg:col-span-1 p-6 bg-white/5 border border-gray-400 rounded-xl">
                            <h3 className="text-lg font-semibold mb-4">Service Latency (P95/P99)</h3>
                            <PerformanceTable />
                        </div>

                        {/* Regional Map Placeholder (2/3) */}
                        <div className="md:col-span-2 p-6 bg-white/5 border border-gray-400 rounded-xl relative min-h-[300px] flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[url('/world-map.svg')] bg-cover opacity-5 grayscale bg-center"></div>
                            <div className="text-center z-10">
                                <h3 className="text-lg font-semibold mb-2">Global Request Distribution</h3>
                                <p className="text-muted-foreground text-sm">Interactive map visualization coming soon.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
