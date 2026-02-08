"use client";

import { Brain, Sparkles } from "lucide-react";
import { Spotlight } from "@/components/common/Spotlight";

export interface AIInsightItem {
    id: number;
    analysis: string;
    metrics?: Record<string, { code: number }>;
    summary?: string;
    timestamp: string;
}

interface AIInsightsProps {
    insights: AIInsightItem[];
}

export function AIInsights({ insights }: AIInsightsProps) {
    const latestInsight = insights[0];

    return (
        <Spotlight className="bg-card border-border h-full flex flex-col">
            <div className="p-4 border-b border-border bg-gradient-to-r from-purple-500/10 to-transparent flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-purple-500/20 rounded-md">
                        <Brain className="h-4 w-4 text-purple-400" />
                    </div>
                    <h3 className="font-semibold text-foreground">AI Sentinel Analysis</h3>
                </div>
                {latestInsight && (
                    <span className="text-xs text-muted-foreground font-mono">
                        {new Date(latestInsight.timestamp).toLocaleTimeString()}
                    </span>
                )}
            </div>

            <div className="p-5 flex-1">
                {latestInsight ? (
                    <div className="space-y-4">
                        <div className="prose prose-invert prose-sm max-w-none">
                            <div className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                                {latestInsight.analysis}
                            </div>
                        </div>

                        {latestInsight.metrics && (
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                {Object.entries(latestInsight.metrics).map(([key, val]) => (
                                    <div key={key} className="bg-muted/50 p-2 rounded border border-border text-center">
                                        <div className="text-[10px] text-muted-foreground uppercase">{key}</div>
                                        <div className={`font-mono font-bold ${val.code >= 500 ? 'text-red-500' : 'text-green-500'}`}>
                                            {val.code}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full py-8 text-muted-foreground">
                        <Sparkles className="h-8 w-8 mb-3 opacity-20" />
                        <p className="text-sm">Waiting for AI Insights...</p>
                        <p className="text-xs opacity-50">Monitoring system streams</p>
                    </div>
                )}
            </div>
        </Spotlight>
    );
}
