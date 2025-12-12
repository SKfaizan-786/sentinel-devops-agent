"use client";

import { Incident } from "@/lib/mockData";
import { Brain, Check, GitBranch, Terminal } from "lucide-react";

interface AgentReasoningPanelProps {
    incident: Incident;
    onClose?: () => void;
}

export function AgentReasoningPanel({ incident }: AgentReasoningPanelProps) {
    // Parse the reasoning JSON if possible, otherwise use raw string
    let parsedReasoning: any = {};
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
    } catch (e) {
        rawLog = incident.reasoning || "Analysis data unavailable.";
    }

    return (
        <div className="bg-slate-900/50 border border-primary/20 rounded-xl overflow-hidden backdrop-blur-md">
            {/* Header */}
            <div className="p-4 border-b border-white/5 bg-primary/5 flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                    <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                        Agent Reasoning Engine
                        <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full border border-primary/20">v2.1</span>
                    </h3>
                    <p className="text-xs text-muted-foreground">Analysis ID: {incident.id}</p>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Real AI Log Output */}
                <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Live Analysis Stream</h4>
                    <div className={`bg-black/80 rounded-lg p-4 border border-white/10 font-mono text-xs overflow-x-auto whitespace-pre-wrap shadow-inner ${incident.severity === 'critical' ? 'text-red-400' :
                            incident.severity === 'warning' ? 'text-orange-400' : 'text-green-300'
                        }`}>
                        <div className="flex items-center gap-2 mb-2 border-b border-white/10 pb-2 text-muted-foreground">
                            <Terminal className="h-3 w-3" />
                            <span>kestra-agent-log.txt</span>
                        </div>
                        {rawLog}
                    </div>
                </div>

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
                            {incident.agentPredictionConfidence}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
