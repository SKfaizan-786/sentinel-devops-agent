"use client";

import { Skeleton } from "@/components/common/Skeleton";

export function AgentReasoningPanelSkeleton() {
    return (
        <div
            className="bg-slate-900/50 border border-primary/20 rounded-xl overflow-hidden backdrop-blur-md"
            aria-busy="true"
            aria-label="Loading AI analysis..."
        >
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-primary/5 flex items-center gap-3">
                <Skeleton variant="rectangular" className="w-9 h-9 rounded-lg bg-primary/20" />
                <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2">
                        <Skeleton variant="text" className="w-40 h-5" />
                        <Skeleton variant="rectangular" className="w-10 h-5 rounded-full" />
                    </div>
                    <Skeleton variant="text" className="w-28 h-3" />
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Live Analysis Stream header */}
                <div>
                    <Skeleton variant="text" className="w-32 h-3 mb-2" />

                    {/* Terminal/log area */}
                    <div className="bg-black/80 rounded-lg p-4 border border-white/10">
                        <div className="flex items-center gap-2 mb-3 border-b border-white/10 pb-2">
                            <Skeleton variant="rectangular" className="w-3 h-3" />
                            <Skeleton variant="text" className="w-32 h-3" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton variant="text" className="w-full h-3" />
                            <Skeleton variant="text" className="w-5/6 h-3" />
                            <Skeleton variant="text" className="w-4/5 h-3" />
                            <Skeleton variant="text" className="w-full h-3" />
                            <Skeleton variant="text" className="w-3/4 h-3" />
                        </div>
                    </div>
                </div>

                {/* Structured Decision grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                        <Skeleton variant="text" className="w-24 h-3 mb-2" />
                        <div className="flex items-center gap-2">
                            <Skeleton variant="rectangular" className="w-4 h-4" />
                            <Skeleton variant="text" className="w-28 h-4" />
                        </div>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                        <Skeleton variant="text" className="w-28 h-3 mb-2" />
                        <div className="flex items-center gap-2">
                            <Skeleton variant="rectangular" className="w-4 h-4" />
                            <Skeleton variant="text" className="w-12 h-4" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
