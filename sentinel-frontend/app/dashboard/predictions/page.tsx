"use client";

import { useMemo } from 'react';
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { useContainers, Container } from "@/hooks/useContainers";
import { usePredictions } from "@/hooks/usePredictions";
import { PredictionBadge } from "@/components/dashboard/PredictionBadge";
import { ForecastChart } from "@/components/dashboard/ForecastChart";
import { Spotlight } from "@/components/common/Spotlight";
import { Button } from "@/components/common/Button";
import { Clock, TrendingUp, AlertTriangle, ShieldCheck } from "lucide-react";

const RISK_THRESHOLD = 0.5;

export default function PredictionsPage() {
    const { containers, loading, refetch: refetchContainers } = useContainers();
    const predictions = usePredictions();

    const stats = useMemo(() => {
        let risky = 0;
        let safe = 0;
        let unknown = 0;
        containers.forEach(c => {
            const pred = predictions[c.id];
            if (pred && pred.probability > RISK_THRESHOLD) risky++;
            else if (pred) safe++;
            else unknown++;
        });
        return { risky, safe, unknown };
    }, [containers, predictions]);

    return (
        <div className="min-h-screen bg-background text-foreground">
            <DashboardHeader />
            <main className="p-6 max-w-7xl mx-auto space-y-6">
                <div>
                    <h1 className="text-2xl font-bold mb-2">Predictive Failure Prevention Engine</h1>
                    <p className="text-muted-foreground">
                        Real-time AI analysis of container health metrics to prevent outages before they occur.
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Spotlight className="p-4 border-l-4 border-l-green-500 bg-card">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Safe Containers</p>
                                <h3 className="text-2xl font-bold">{stats.safe}</h3>
                            </div>
                            <ShieldCheck className="text-green-500 h-8 w-8" />
                        </div>
                    </Spotlight>
                    <Spotlight className="p-4 border-l-4 border-l-amber-500 bg-card">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Monitoring Active</p>
                                <h3 className="text-2xl font-bold">{containers.length}</h3>
                            </div>
                            <Clock className="text-amber-500 h-8 w-8" />
                        </div>
                    </Spotlight>
                    <Spotlight className="p-4 border-l-4 border-l-red-500 bg-card">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-sm text-muted-foreground">Predicted Failures</p>
                                <h3 className="text-2xl font-bold text-red-500">{stats.risky}</h3>
                            </div>
                            <AlertTriangle className="text-red-500 h-8 w-8" />
                        </div>
                    </Spotlight>
                </div>

                {/* Prediction List */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {containers.map((container: Container) => {
                        const prediction = predictions[container.id];
                        // If no prediction or low risk, show mostly neutral
                        // If high risk, show forecast
                        const isRisky = prediction && prediction.probability > RISK_THRESHOLD;

                        return (
                            <Spotlight key={container.id} className={`p-6 ${isRisky ? 'border-amber-500/50 bg-amber-500/5' : ''}`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-semibold text-lg">{container.name.replace('/', '')}</h3>
                                        <div className="text-xs text-muted-foreground font-mono mt-1">{container.id.substring(0, 12)}</div>
                                    </div>
                                    {prediction ? (
                                        <PredictionBadge prediction={prediction} />
                                    ) : (
                                        <span className="text-xs bg-muted px-2 py-1 rounded">No Signal</span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                     <div>
                                         <p className="text-xs uppercase text-muted-foreground">CPU Usage</p>
                                         <p className="font-mono">{container.metrics?.cpu || '0'}%</p>
                                     </div>
                                     <div>
                                         <p className="text-xs uppercase text-muted-foreground">Memory</p>
                                         <p className="font-mono">{container.metrics?.memory?.percent || '0'}%</p>
                                     </div>
                                </div>

                                {isRisky && prediction.history && prediction.history.length > 0 && (
                                    <div className="bg-background rounded-lg p-4 border border-border mt-4">
                                        <div className="flex items-center gap-2 mb-2 text-amber-500">
                                            <TrendingUp className="h-4 w-4" />
                                            <span className="font-semibold text-xs">Failure Forecast</span>
                                        </div>
                                        <p className="text-sm mb-4">{prediction.reason}</p>
                                        
                                        <ForecastChart 
                                            history={prediction.history} 
                                            label="Resource Usage Trend"
                                            threshold={90}
                                            prediction={{ slope: prediction.slope ?? 0, timeToFailure: prediction.estimatedFailureInSeconds ?? 300 }}
                                        />
                                    </div>
                                )}
                                
                                <div className="mt-4 flex justify-end gap-2">
                                    <Button variant="ghost" size="sm">Logs</Button>
                                    <Button variant="outline" size="sm" onClick={() => refetchContainers()}>Refresh</Button>
                                    {isRisky && <Button variant="destructive" size="sm">Preempt Restart</Button>}
                                </div>
                            </Spotlight>
                        );
                    })}
                    
                    {containers.length === 0 && !loading && (
                        <div className="col-span-2 text-center py-12 text-muted-foreground">
                            No containers found.
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
