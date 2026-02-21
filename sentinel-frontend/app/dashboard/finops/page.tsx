"use client";

import { useFinOps } from "@/hooks/useFinOps";
import { SavingsCard } from "@/components/finops/SavingsCard";
import { CostBreakdownChart } from "@/components/finops/CostBreakdownChart";
import { WasteHeatmap } from "@/components/finops/WasteHeatmap";
import { RightSizingTable } from "@/components/finops/RightSizingTable";
import { useState } from "react";
import { Skeleton } from "@/components/common/Skeleton";
import { RefreshCcw, DollarSign } from "lucide-react";
import { Button } from "@/components/common/Button";

const CLOUD_PRESETS = [
    { id: 'aws', name: 'AWS (t3.medium)' },
    { id: 'gcp', name: 'GCP (e2-medium)' },
    { id: 'azure', name: 'Azure (B-series)' },
];

export default function FinOpsPage() {
    const [preset, setPreset] = useState('aws');
    const { data, loading, refetch } = useFinOps(preset);

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground flex items-center gap-3">
                        <DollarSign className="text-primary h-8 w-8" />
                        FinOps & Cost Optimization
                    </h1>
                    <p className="text-muted-foreground">Monitor container spend, identify waste, and optimize your cloud bill.</p>
                </div>

                <div className="flex items-center gap-3">
                    <select
                        value={preset}
                        onChange={(e) => setPreset(e.target.value)}
                        className="h-10 px-3 py-2 rounded-md border border-border bg-white/5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                        {CLOUD_PRESETS.map(p => (
                            <option key={p.id} value={p.id} className="bg-slate-900">{p.name}</option>
                        ))}
                    </select>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => refetch()}
                        className="flex items-center gap-2"
                    >
                        <RefreshCcw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {loading && !data ? (
                <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[1, 2, 3].map(i => <Skeleton key={i} className="h-32 rounded-2xl" />)}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <Skeleton className="h-[400px] rounded-2xl" />
                        <Skeleton className="h-[400px] rounded-2xl" />
                    </div>
                    <Skeleton className="h-[300px] rounded-2xl" />
                </div>
            ) : data ? (
                <>
                    <SavingsCard
                        totalMonthlyEstimate={data.totalMonthlyEstimate}
                        totalPotentialSavings={data.totalPotentialSavings}
                        wastePercent={data.wastePercent}
                    />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        <CostBreakdownChart containers={data.containers} />
                        <WasteHeatmap containers={data.containers} />
                    </div>

                    <RightSizingTable containers={data.containers} />
                </>
            ) : (
                <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-muted/30">
                    <DollarSign className="mx-auto h-12 w-12 text-muted-foreground opacity-20 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No FinOps Data Available</h3>
                    <p className="text-muted-foreground">Ensure the backend is running and containers are being monitored.</p>
                </div>
            )}
        </div>
    );
}
