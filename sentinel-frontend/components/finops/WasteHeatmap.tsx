"use client";

import { cn } from "@/lib/utils";

interface WasteHeatmapProps {
    containers: Array<{
        name: string;
        wasteClass: string;
        avgCPUPercent: number | null;
        avgMemPercent: number | null;
    }>;
}

export function WasteHeatmap({ containers }: WasteHeatmapProps) {
    return (
        <div className="glass border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border flex flex-row items-center justify-between pb-6">
                <h3 className="text-lg font-semibold">Resource Efficiency Heatmap</h3>
                <div className="hidden sm:flex gap-4 text-[10px] uppercase font-bold tracking-tighter text-muted-foreground">
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500" /> Healthy</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-yellow-500" /> Over</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500" /> Idle</div>
                    <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Zombie</div>
                </div>
            </div>
            <div className="p-6">
                {containers.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground text-sm">
                        No containers available to analyze.
                    </div>
                ) : (
                    <div role="grid" aria-label="Resource efficiency heatmap" className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2 py-4">
                        {containers.map((c) => (
                            <div
                                key={c.name}
                                role="gridcell"
                                tabIndex={0}
                                aria-label={`${c.name}: ${c.wasteClass}, CPU ${c.avgCPUPercent ?? 'N/A'}%, Memory ${c.avgMemPercent ?? 'N/A'}%`}
                                title={`${c.name} (${c.wasteClass})\nCPU: ${c.avgCPUPercent ?? 'N/A'}%\nMem: ${c.avgMemPercent ?? 'N/A'}%`}
                                className={cn(
                                    "aspect-square rounded-md transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                                    c.wasteClass === 'healthy' && "bg-green-500/80 shadow-[0_0_10px_rgba(34,197,94,0.3)]",
                                    c.wasteClass === 'over-provisioned' && "bg-yellow-500/80 shadow-[0_0_10px_rgba(234,179,8,0.3)]",
                                    c.wasteClass === 'idle' && "bg-orange-500/80 shadow-[0_0_10px_rgba(249,115,22,0.3)]",
                                    c.wasteClass === 'zombie' && "bg-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)]",
                                )} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
