"use client";

import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AnalyticsHeader } from "@/components/analytics/AnalyticsHeader";
import { ResourcesChart } from "@/components/analytics/ResourcesChart";
import { TrafficChart } from "@/components/analytics/TrafficChart";
import { PerformanceTable } from "@/components/analytics/PerformanceTable";
import { Info } from "lucide-react";

export default function AnalyticsPage() {
    return (
        <div>
            <DashboardHeader />
            <div className="p-4 lg:p-6">
                <div className="container mx-auto max-w-7xl pb-20 space-y-8">
                    <AnalyticsHeader />

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {/* Main Resources Chart (2/3 width) */}
                        <div className="md:col-span-2 p-6 bg-white/5 border border-white/10 rounded-xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-lg font-semibold text-white">Cluster Resource Usage</h3>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#c084fc]" /> CPU</span>
                                    <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-[#2dd4bf]" /> Memory</span>
                                </div>
                            </div>
                            <ResourcesChart />
                        </div>

                        {/* Scorecard / Stats (1/3 width) */}
                        <div className="space-y-6">
                            <div className="p-6 bg-white/5 border border-white/10 rounded-xl relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Info className="h-24 w-24" />
                                </div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1">System Health Score</h3>
                                <div className="text-5xl font-bold text-white mb-2">98<span className="text-2xl text-muted-foreground">/100</span></div>
                                <p className="text-xs text-green-400 flex items-center gap-1">
                                    +2.4% from last week
                                </p>
                            </div>

                            <div className="p-6 bg-white/5 border border-white/10 rounded-xl">
                                <h3 className="text-sm font-semibold text-white mb-4">Traffic Volume</h3>
                                <TrafficChart />
                            </div>
                        </div>

                        {/* Performance Table (Full Width or 2/3) */}
                        <div className="md:col-span-2 lg:col-span-1 p-6 bg-white/5 border border-white/10 rounded-xl">
                            <h3 className="text-lg font-semibold text-white mb-4">Service Latency (P95/P99)</h3>
                            <PerformanceTable />
                        </div>

                        {/* Regional Map Placeholder (2/3) */}
                        <div className="md:col-span-2 p-6 bg-white/5 border border-white/10 rounded-xl relative min-h-[300px] flex items-center justify-center overflow-hidden">
                            <div className="absolute inset-0 bg-[url('https://upload.wikimedia.org/wikipedia/commons/e/ec/World_map_blank_without_borders.svg')] bg-cover opacity-5 grayscale bg-center"></div>
                            <div className="text-center z-10">
                                <h3 className="text-lg font-semibold text-white mb-2">Global Request Distribution</h3>
                                <p className="text-muted-foreground text-sm">Interactive map visualization coming soon.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
