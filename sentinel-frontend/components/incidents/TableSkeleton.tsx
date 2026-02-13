"use client";

import { Skeleton } from "@/components/common/Skeleton";

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 6 }: TableSkeletonProps) {
    return (
        <div
            className="bg-white/5 border border-white/10 rounded-xl overflow-hidden"
            role="status"
            aria-busy="true"
            aria-label="Loading incidents..."
        >
            {/* Header skeleton */}
            <div className="border-b border-white/10 p-4">
                <div className="flex gap-4">
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton
                            key={`header-${i}`}
                            variant="rectangular"
                            width={i === 3 ? 200 : 100}
                            height={16}
                        />
                    ))}
                </div>
            </div>

            {/* Row skeletons */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div
                    key={`row-${rowIndex}`}
                    className="border-b border-white/5 last:border-0 p-4"
                >
                    <div className="flex items-center gap-4">
                        {/* Timestamp */}
                        <Skeleton variant="text" width={80} />
                        {/* Service */}
                        <Skeleton variant="text" width={100} />
                        {/* Severity badge */}
                        <Skeleton variant="rectangular" width={60} height={24} className="rounded-full" />
                        {/* Title/Description */}
                        <Skeleton variant="text" width={200} />
                        {/* Status badge */}
                        <Skeleton variant="rectangular" width={80} height={24} className="rounded-full" />
                        {/* Duration */}
                        <Skeleton variant="text" width={60} />
                    </div>
                </div>
            ))}
        </div>
    );
}
