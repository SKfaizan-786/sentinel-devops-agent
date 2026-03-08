"use client";

import { Calendar } from "lucide-react";

export function AnalyticsHeader() {
    return (
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">System Analytics</h1>
                <p className="text-muted-foreground">Historical performance data and resource usage trends.</p>
            </div>

            <div className="flex items-center gap-2 bg-white/5 border border-gray-400 rounded-lg p-1">
                <button className="px-3 py-1.5 text-xs font-medium bg-white/10 rounded-md shadow-sm border border-white/5">
                    Last 24h
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors">
                    7 Days
                </button>
                <button className="px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors">
                    30 Days
                </button>
                <div className="w-[1px] h-4 bg-white/10 mx-1" />
                <button className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-white transition-colors">
                    <Calendar className="h-3 w-3" />
                    Custom
                </button>
            </div>
        </div>
    );
}
