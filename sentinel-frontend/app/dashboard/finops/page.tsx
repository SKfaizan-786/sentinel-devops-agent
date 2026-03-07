'use client';

import { DashboardHeader } from '@/components/layout/DashboardHeader';
import { SavingsCard } from '@/components/finops/SavingsCard';
import { WasteHeatmap } from '@/components/finops/WasteHeatmap';
import { CostBreakdownChart } from '@/components/finops/CostBreakdownChart';
import { RightSizingTable } from '@/components/finops/RightSizingTable';
import { useFinOps } from '@/hooks/useFinOps';
import { Loader2, Sparkles } from 'lucide-react';

export default function FinOpsPage() {
    const {
        summary,
        recommendations,
        heatmapData,
        loading,
        analyzing,
        analyze,
        applyRecommendation,
        dismissRecommendation,
    } = useFinOps();

    return (
        <div>
            <DashboardHeader />
            <div className="p-4 lg:p-6">
                <div className="space-y-6">
                    {/* Page Header */}
                    <div className="flex items-center justify-between flex-wrap gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight mb-2">
                                FinOps Advisor
                            </h1>
                            <p className="text-muted-foreground">
                                AI-powered cost optimization and right-sizing recommendations for your infrastructure.
                            </p>
                        </div>
                        <button
                            id="run-finops-analysis"
                            onClick={analyze}
                            disabled={analyzing}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-linear-to-r from-emerald-500 to-cyan-500 text-white font-medium hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {analyzing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Analyzing...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    Run Analysis
                                </>
                            )}
                        </button>
                    </div>

                    {/* Summary Cards */}
                    <SavingsCard summary={summary} loading={loading} />

                    {/* Heatmap + Cost Chart */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <WasteHeatmap data={heatmapData} loading={loading} />
                        <CostBreakdownChart data={heatmapData} loading={loading} />
                    </div>

                    {/* Recommendations Table */}
                    <RightSizingTable
                        recommendations={recommendations}
                        loading={loading}
                        onApply={applyRecommendation}
                        onDismiss={dismissRecommendation}
                    />
                </div>
            </div>
        </div>
    );
}
