"use client";

import { Skeleton } from "@/components/common/Skeleton";

function IncidentCardSkeleton() {
    return (
        <div className="p-4 rounded-xl bg-card border border-border">
            {/* Header with severity badge and timestamp */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <Skeleton variant="circular" width={32} height={32} />
                    <div className="space-y-2">
                        <Skeleton variant="text" className="w-32 h-5" />
                        <Skeleton variant="text" className="w-20 h-3" />
                    </div>
                </div>
                <Skeleton variant="rectangular" className="w-16 h-6 rounded-full" />
            </div>

            {/* Description */}
            <div className="space-y-2 mb-3">
                <Skeleton variant="text" className="w-full" />
                <Skeleton variant="text" className="w-2/3" />
            </div>

            {/* Footer with action button */}
            <div className="flex items-center justify-between pt-3 border-t border-border">
                <Skeleton variant="text" className="w-24 h-4" />
                <Skeleton variant="rectangular" className="w-28 h-8 rounded-lg" />
            </div>
        </div>
    );
}

export function IncidentTimelineSkeleton({ count = 2 }: { count?: number }) {
    return (
        <div
            className="space-y-6"
            aria-busy="true"
            aria-label="Loading incidents..."
        >
            {/* Active section header */}
            <div className="space-y-3">
                <div className="flex items-center gap-2">
                    <Skeleton variant="circular" width={8} height={8} />
                    <Skeleton variant="text" className="w-28 h-4" />
                </div>
                <IncidentCardSkeleton />
            </div>

            {/* Recent history section */}
            <div className="space-y-3">
                <Skeleton variant="text" className="w-24 h-4" />
                {Array.from({ length: count - 1 }).map((_, i) => (
                    <IncidentCardSkeleton key={i} />
                ))}
            </div>
        </div>
    );
}
