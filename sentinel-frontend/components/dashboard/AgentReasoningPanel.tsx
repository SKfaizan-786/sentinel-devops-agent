"use client";

import { useState, useEffect } from "react";
import { Incident } from "@/lib/mockData";
import { useReasoningStream } from "@/hooks/useReasoningStream";
import { ConfidenceMeter } from "./ConfidenceMeter";
import { EvidenceChain } from "./EvidenceChain";
import { Brain, Check, GitBranch, Terminal, Zap, AlertCircle, RefreshCw } from "lucide-react";

interface AgentReasoningPanelProps {
    incident: Incident;
    onClose?: () => void;
    liveStreamEnabled?: boolean;
}

export function AgentReasoningPanel({ 
    incident, 
    liveStreamEnabled = true 
}: AgentReasoningPanelProps) {
    const [expandedStepId, setExpandedStepId] = useState<number | undefined>();
    const [showLiveStream, setShowLiveStream] = useState(false);
    
    // Use the reasoning stream hook
    const {
        steps,
        isLoading,
        error,
        currentConfidence,
        maxConfidence,
        isConnected,
        reconnect,
    } = useReasoningStream(incident.id, liveStreamEnabled);

    // Parse the reasoning JSON if possible, otherwise use raw string
    let parsedReasoning: { choices?: { message?: { content?: string } }[], summary?: string } = {};
    let rawLog = "";

    try {
        parsedReasoning = JSON.parse(incident.reasoning || "{}");
        // If it's the Groq response structure
        if (parsedReasoning.choices?.[0]?.message?.content) {
            rawLog = parsedReasoning.choices[0].message.content;
        } else if (parsedReasoning.summary) {
            rawLog = parsedReasoning.summary;
        } else {
            rawLog = incident.reasoning || ""; // Fallback to raw string
        }
    } catch {
        rawLog = incident.reasoning || "Analysis data unavailable.";
    }

    // Determine if we have live data or fallback data
    const hasLiveData = steps.length > 0;

    return (
        <div className="bg-slate-900/50 border border-primary/20 rounded-xl overflow-hidden backdrop-blur-md">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-primary/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                        <Brain className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-white font-semibold flex items-center gap-2">
                            Agent Reasoning Engine
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20">v3.0-Live</span>
                        </h3>
                        <p className="text-xs text-muted-foreground">
                            Analysis ID: {incident.id} 
                            {liveStreamEnabled && (
                                <span className={`ml-2 inline-flex items-center gap-1 transition-colors duration-300 ${isConnected ? 'text-green-400' : 'text-yellow-500'}`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-500'}`} />
                                    {isConnected ? 'Live streaming' : isLoading ? 'Connecting...' : 'Disconnected'}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                
                {/* Toggle Buttons */}
                <div className="flex items-center gap-2">
                    {!hasLiveData && isLoading && (
                        <button
                            onClick={reconnect}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title="Reconnect to reasoning stream"
                        >
                            <RefreshCw className="h-4 w-4 text-yellow-400 animate-spin" />
                        </button>
                    )}
                    <button
                        onClick={() => setShowLiveStream(!showLiveStream)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                            showLiveStream
                                ? "bg-primary/20 text-primary border border-primary/30"
                                : "bg-white/5 text-muted-foreground border border-white/10 hover:bg-white/10"
                        }`}
                    >
                        {showLiveStream ? "Hide" : "Show"} Live Reasoning
                    </button>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Live Reasoning Steps - When enabled and has data */}
                {showLiveStream && hasLiveData && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Zap className="h-3 w-3 text-yellow-400" />
                                Live Reasoning Chain
                            </h4>
                            <span className="text-xs text-muted-foreground">
                                {steps.length} step{steps.length !== 1 ? "s" : ""}
                            </span>
                        </div>
                        <EvidenceChain
                            steps={steps}
                            isLoading={isLoading}
                            maxStepsToShow={5}
                            expandedStepId={expandedStepId}
                            onExpandStep={setExpandedStepId}
                        />
                    </div>
                )}

                {/* Current Confidence Meter */}
                {hasLiveData && (
                    <div className="p-4 bg-white/5 rounded-lg border border-white/5">
                        <div className="flex items-baseline justify-between mb-3">
                            <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Current Confidence</h5>
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
                )}

                {/* Error Display */}
                {error && (
                    <div className="p-3 bg-red-500/10 border border-red-400/30 rounded-lg flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <div className="text-xs text-red-300">
                            {error}
                            {error.includes("Max reconnection") || error.includes("closed") ? (
                                <button
                                    onClick={reconnect}
                                    className="ml-2 underline hover:no-underline font-medium"
                                >
                                    Retry
                                </button>
                            ) : null}
                        </div>
                    </div>
                )}

                {/* Fallback: Real AI Log Output */}
                {(!showLiveStream || !hasLiveData) && (
                    <div>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-2">
                            <Terminal className="h-3 w-3" />
                            {hasLiveData ? "Full Analysis Log" : "Live Analysis Stream"}
                        </h4>
                        <div
                            className={`bg-black/80 rounded-lg p-4 border border-white/10 font-mono text-xs overflow-x-auto whitespace-pre-wrap shadow-inner max-h-64 overflow-y-auto ${
                                incident.severity === "critical"
                                    ? "text-red-400"
                                    : incident.severity === "warning"
                                    ? "text-orange-400"
                                    : "text-green-300"
                            }`}
                        >
                            {rawLog || "Loading analysis..."}
                        </div>
                    </div>
                )}

                {/* Structured Decision */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                        <h5 className="text-xs text-muted-foreground mb-1">Triggered Action</h5>
                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-purple-400" />
                            {incident.agentAction}
                        </p>
                    </div>
                    <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                        <h5 className="text-xs text-muted-foreground mb-1">Confidence Score</h5>
                        <p className="text-sm font-semibold text-white flex items-center gap-2">
                            <Check className="h-4 w-4 text-green-400" />
                            {hasLiveData ? Math.round(currentConfidence * 100) : incident.agentPredictionConfidence}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
