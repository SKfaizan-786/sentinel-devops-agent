"use client";

import { Skeleton } from "@/components/common/Skeleton";

export function ChartSkeleton() {
    // Generate random heights for bar chart effect
    const barHeights = [65, 45, 80, 55, 70, 40, 85, 60, 50, 75, 45, 65];

    return (
        <div
            className="p-6 rounded-xl bg-card border border-border"
            aria-busy="true"
            aria-label="Loading chart..."
        >
            {/* Title placeholder */}
            <div className="flex items-center justify-between mb-4">
                <Skeleton variant="text" className="w-40 h-6" />
                <div className="flex gap-2">
                    <Skeleton variant="rectangular" className="w-20 h-8 rounded-lg" />
                    <Skeleton variant="rectangular" className="w-20 h-8 rounded-lg" />
                </div>
            </div>

            {/* Tab buttons placeholder */}
            <div className="flex gap-2 mb-6">
                {[1, 2, 3, 4].map((i) => (
                    <Skeleton
                        key={i}
                        variant="rectangular"
                        className="w-24 h-8 rounded-lg"
                    />
                ))}
            </div>

            {/* Chart area - bar chart style */}
            <div className="flex items-end justify-between gap-2 h-48">
                {barHeights.map((height, i) => (
                    <Skeleton
                        key={i}
                        variant="rectangular"
                        className="flex-1 rounded-t"
                        height={`${height}%`}
                    />
                ))}
            </div>

            {/* X-axis labels placeholder */}
            <div className="flex justify-between mt-2">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} variant="text" className="w-8 h-3" />
                ))}
            </div>
        </div>
    );
}

// Full metrics section skeleton with multiple charts
export function MetricsChartsSkeleton() {
    return (
        <div className="space-y-6" aria-busy="true" aria-label="Loading metrics...">
            <ChartSkeleton />
        </div>
    );
}
