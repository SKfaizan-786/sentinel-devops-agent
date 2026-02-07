"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps {
    className?: string;
    variant?: "text" | "circular" | "rectangular";
    width?: string | number;
    height?: string | number;
}

export function Skeleton({
    className,
    variant = "rectangular",
    width,
    height,
}: SkeletonProps) {
    return (
        <div
            className={cn(
                "animate-pulse bg-white/10",
                {
                    "rounded-full": variant === "circular",
                    "rounded-md": variant === "rectangular",
                    "rounded h-4": variant === "text",
                },
                className
            )}
            style={{ width, height }}
            aria-busy="true"
            aria-label="Loading..."
            role="status"
        />
    );
}

// Convenience wrapper for multiple skeleton lines
export function SkeletonGroup({
    count = 3,
    className,
}: {
    count?: number;
    className?: string;
}) {
    return (
        <div className="space-y-2" aria-busy="true" aria-label="Loading content...">
            {Array.from({ length: count }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="text"
                    className={cn(
                        i === count - 1 ? "w-3/4" : "w-full",
                        className
                    )}
                />
            ))}
        </div>
    );
}
