"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { Incident } from "@/lib/mockData";
import { TraceTimeline, TraceLike } from "@/components/traces/TraceTimeline";
import { FailurePoint } from "@/components/traces/FailurePoint";
import { useReasoningStream } from "@/hooks/useReasoningStream";
import { ConfidenceMeter } from "@/components/dashboard/ConfidenceMeter";
import { EvidenceChain } from "@/components/dashboard/EvidenceChain";
import { ArrowLeft, Brain, Clock, Download } from "lucide-react";

interface TraceResponse {
    service: string;
    from: number;
    to: number;
    incidentTimestamp?: number | null;
    windowMs?: number;
    rootCause?: {
        operation?: string | null;
        service?: string | null;
        errorMessage?: string | null;
        duration?: number | null;
        spanId?: string | null;
        traceId?: string | null;
    } | null;
    traces: TraceLike[];
}

export default function IncidentDetailsPage() {
    const router = useRouter();
    const { id: incidentId } = useParams<{ id: string }>();

    const [incident, setIncident] = useState<Incident | null>(null);
    const [traceData, setTraceData] = useState<TraceResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedStepId, setExpandedStepId] = useState<number | undefined>();
    const [selectedTimeRange, setSelectedTimeRange] = useState<'all' | '10' | '50'>('10');

    // Use the reasoning stream hook
    const {
        steps,
        isLoading: reasoningLoading,
        error: reasoningError,
        currentConfidence,
        maxConfidence,
        isConnected,
        reconnect,
    } = useReasoningStream(incidentId, !!incidentId);

    useEffect(() => {
        if (!incidentId) {
            setError("Missing incident identifier");
            setIsLoading(false);
            return;
        }

        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

        async function loadIncidentAndTrace() {
            try {
                setIsLoading(true);
                setError(null);

                // Fetch all insights and pick the one matching this incident
                const res = await fetch(`${apiUrl}/insights`);
                if (!res.ok) throw new Error("Failed to fetch incident");
                const data = await res.json();

                const incidents: Incident[] = (data.insights || []).map((insight: any) => {
                    // Reuse backend payload and structure through the existing parser on the dashboard
                    // For now, keep shape minimal and fallback to mock incident parsing
                    return {
                        id: String(insight.id),
                        title: insight.summary || "Incident",
                        serviceId: insight.serviceId || insight.service || insight.service_name || "system",
                        status: "failed",
                        severity: "warning",
                        timestamp: insight.timestamp || new Date().toISOString(),
                        duration: "Unknown",
                        rootCause: "Service failure detected",
                        agentAction: "Monitoring",
                        agentPredictionConfidence: 0,
                        timeline: [],
                        reasoning: insight.analysis || insight.summary,
                    };
                });

                const found = incidents.find(i => i.id === incidentId);
                if (!found) {
                    throw new Error("Incident not found");
                }

                setIncident(found);

                let url = `${apiUrl}/traces?service=${encodeURIComponent(found.serviceId)}`;
                const ts = Date.parse(found.timestamp);
                if (!Number.isNaN(ts)) {
                    url += `&timestamp=${ts}`;
                }
                const traceRes = await fetch(url);

                if (traceRes.ok) {
                    const traceJson: TraceResponse = await traceRes.json();
                    setTraceData(traceJson);
                } else {
                    setTraceData(null);
                }
            } catch (e: any) {
                console.error(e);
                setError(e.message || "Failed to load incident");
            } finally {
                setIsLoading(false);
            }
        }

        void loadIncidentAndTrace();
    }, [incidentId]);

    const exportReasoningHistory = () => {
        const data = {
            incidentId,
            timestamp: new Date().toISOString(),
            stats: {
                totalSteps: steps.length,
                currentConfidence: currentConfidence,
                maxConfidence: maxConfidence,
            },
            steps: steps,
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `incident-${incidentId}-reasoning.json`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const primaryTrace = useMemo<TraceLike | null>(() => {
        if (!traceData || !traceData.traces || traceData.traces.length === 0) return null;
        return traceData.traces[0];
    }, [traceData]);

    return (
        <div className="space-y-8 pb-20">
            <div>
                <DashboardHeader />
                <div className="px-4 lg:px-6 py-6 space-y-8 max-w-5xl mx-auto">
                    <button
                        onClick={() => router.back()}
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-2"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Back to Incidents
                    </button>

                    {isLoading ? (
                        <p className="text-muted-foreground">Loading incident details…</p>
                    ) : error ? (
                        <p className="text-red-400 text-sm">{error}</p>
                    ) : !incident ? (
                        <p className="text-muted-foreground">Incident not found.</p>
                    ) : (
                        <>
                            <div className="space-y-2">
                                <h1 className="text-2xl font-bold text-foreground">{incident.title}</h1>
                                <p className="text-sm text-muted-foreground">
                                    ID: <span className="font-mono">{incident.id}</span> ·{" "}
                                    {new Date(incident.timestamp).toLocaleString()}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-xs uppercase text-muted-foreground mb-1">Status</div>
                                    <div className="text-lg font-semibold text-foreground capitalize">
                                        {incident.status.replace("-", " ")}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-xs uppercase text-muted-foreground mb-1">Severity</div>
                                    <div className="text-lg font-semibold text-foreground capitalize">
                                        {incident.severity}
                                    </div>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <div className="text-xs uppercase text-muted-foreground mb-1">Duration</div>
                                    <div className="text-lg font-semibold text-foreground">
                                        {incident.duration}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold text-foreground">AI Reasoning Analysis</h2>
                                
                                {/* Reasoning Chain Card */}
                                <div className="bg-slate-900/50 border border-primary/20 rounded-xl overflow-hidden">
                                    <div className="p-4 border-b border-white/5 bg-primary/5 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-primary/20 rounded-lg">
                                                <Brain className="h-5 w-5 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="text-white font-semibold">Reasoning Chain</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    {steps.length > 0 ? `${steps.length} steps recorded` : 'Waiting for reasoning data...'}
                                                </p>
                                            </div>
                                        </div>

                                        {steps.length > 0 && (
                                            <button
                                                onClick={exportReasoningHistory}
                                                className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium bg-blue-500/20 text-blue-300 rounded-lg border border-blue-400/30 hover:bg-blue-500/30 transition-colors"
                                            >
                                                <Download className="h-3 w-3" />
                                                Export
                                            </button>
                                        )}
                                    </div>

                                    <div className="p-6">
                                        {steps.length > 0 ? (
                                            <div>
                                                {/* Time Range Selector */}
                                                <div className="flex gap-2 mb-4 pb-4 border-b border-white/5">
                                                    {(['all', '10', '50'] as const).map((range) => (
                                                        <button
                                                            key={range}
                                                            onClick={() => setSelectedTimeRange(range)}
                                                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                                                                selectedTimeRange === range
                                                                    ? 'bg-primary/20 text-primary border border-primary/30'
                                                                    : 'bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10'
                                                            }`}
                                                        >
                                                            {range === 'all' ? 'All' : `Last ${range}`}
                                                        </button>
                                                    ))}
                                                </div>

                                                <EvidenceChain
                                                    steps={selectedTimeRange === 'all'
                                                        ? steps
                                                        : steps.slice(-parseInt(selectedTimeRange))}
                                                    isLoading={reasoningLoading}
                                                    maxStepsToShow={selectedTimeRange === 'all' ? steps.length : parseInt(selectedTimeRange)}
                                                    expandedStepId={expandedStepId}
                                                    onExpandStep={setExpandedStepId}
                                                />

                                                {/* Confidence Meter */}
                                                <div className="mt-6 pt-6 border-t border-white/5">
                                                    <div className="flex items-baseline justify-between mb-3">
                                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Confidence</h4>
                                                        {maxConfidence > currentConfidence && (
                                                            <span className="text-xs text-blue-400">Peak: {Math.round(maxConfidence * 100)}%</span>
                                                        )}
                                                    </div>
                                                    <ConfidenceMeter
                                                        confidence={currentConfidence}
                                                        maxConfidence={maxConfidence}
                                                        animated={true}
                                                        size="md"
                                                        showLabel={true}
                                                        showDetails={true}
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-center py-8">
                                                <p className="text-muted-foreground text-sm">
                                                    {reasoningLoading
                                                        ? 'Listening for reasoning stream...'
                                                        : reasoningError
                                                        ? `Error: ${reasoningError}`
                                                        : 'No reasoning data yet. This incident will show reasoning steps as it\'s analyzed.'}
                                                </p>
                                                {reasoningError && (
                                                    <button
                                                        onClick={reconnect}
                                                        className="mt-3 px-3 py-1.5 text-xs font-medium bg-white/5 text-white rounded border border-white/10 hover:bg-white/10 transition-colors"
                                                    >
                                                        Retry
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold text-foreground">Distributed Trace</h2>
                                {traceData ? (
                                    <>
                                        <FailurePoint context={traceData.rootCause || null} />
                                        <div className="mt-4">
                                            <TraceTimeline trace={primaryTrace} />
                                        </div>
                                    </>
                                ) : (
                                    <p className="text-sm text-muted-foreground">
                                        No distributed tracing data available for this incident.
                                    </p>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

