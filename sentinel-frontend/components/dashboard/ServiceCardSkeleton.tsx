"use client";

import { Skeleton } from "@/components/common/Skeleton";
import { Spotlight } from "@/components/common/Spotlight";

export function ServiceCardSkeleton() {
    return (
        <Spotlight className="p-5 bg-card border-border">
            {/* Header with icon and title */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <Skeleton variant="rectangular" width={40} height={40} className="rounded-lg" />
                    <div className="space-y-2">
                        <Skeleton variant="text" className="w-24" />
                        <div className="flex items-center gap-2">
                            <Skeleton variant="circular" width={12} height={12} />
                            <Skeleton variant="text" className="w-16" />
                        </div>
                    </div>
                </div>
                <Skeleton variant="rectangular" width={32} height={32} className="rounded" />
            </div>

            {/* Metrics grid */}
            <div className="grid grid-cols-3 gap-2 mb-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="p-2 rounded bg-muted">
                        <Skeleton variant="text" className="w-12 h-2 mb-2" />
                        <Skeleton variant="text" className="w-10 h-4" />
                    </div>
                ))}
            </div>

            {/* Sparkline placeholder */}
            <Skeleton variant="rectangular" height={40} className="w-full rounded opacity-50" />
        </Spotlight>
    );
}

// Grid of service card skeletons
export function ServiceGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
            aria-busy="true"
            aria-label="Loading services..."
        >
            {Array.from({ length: count }).map((_, i) => (
                <ServiceCardSkeleton key={i} />
            ))}
        </div>
    );
}
