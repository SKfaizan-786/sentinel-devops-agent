"use client";

import { Activity, CheckCircle, AlertTriangle, Zap } from "lucide-react";
import { Spotlight } from "@/components/common/Spotlight";

interface HealthSummaryProps {
    uptime: number;
    servicesUp: number;
    totalServices: number;
    activeIncidents: number;
}

export function HealthSummary({ uptime, servicesUp, totalServices, activeIncidents }: HealthSummaryProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Spotlight className="p-4 bg-white/5 border-white/5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">System Health</p>
                        <h3 className="text-2xl font-bold mt-1 text-white">{uptime}%</h3>
                    </div>
                    <div className="p-2 bg-green-500/10 rounded-lg">
                        <Activity className="h-5 w-5 text-green-500" />
                    </div>
                </div>
                <div className="mt-4 flex items-center text-xs text-green-400">
                    <Zap className="h-3 w-3 mr-1" />
                    <span>Operational</span>
                </div>
            </Spotlight>

            <Spotlight className="p-4 bg-white/5 border-white/5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Services Up</p>
                        <h3 className="text-2xl font-bold mt-1 text-white">{servicesUp}/{totalServices}</h3>
                    </div>
                    <div className="p-2 bg-blue-500/10 rounded-lg">
                        <CheckCircle className="h-5 w-5 text-blue-500" />
                    </div>
                </div>
                <div className="mt-4 w-full bg-white/10 rounded-full h-1">
                    <div
                        className="bg-blue-500 h-1 rounded-full transition-all duration-500"
                        style={{ width: `${(servicesUp / totalServices) * 100}%` }}
                    />
                </div>
            </Spotlight>

            <Spotlight className="p-4 bg-white/5 border-white/5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Active Incidents</p>
                        <h3 className="text-2xl font-bold mt-1 text-white">{activeIncidents}</h3>
                    </div>
                    <div className={`p-2 rounded-lg ${activeIncidents > 0 ? "bg-red-500/10" : "bg-white/5"}`}>
                        <AlertTriangle className={`h-5 w-5 ${activeIncidents > 0 ? "text-red-500" : "text-muted-foreground"}`} />
                    </div>
                </div>
                {activeIncidents > 0 && (
                    <div className="mt-4 text-xs text-red-400 animate-pulse">
                        Requires attention
                    </div>
                )}
            </Spotlight>

            <Spotlight className="p-4 bg-white/5 border-white/5">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">Auto-Healed (24h)</p>
                        <h3 className="text-2xl font-bold mt-1 text-white">14</h3>
                    </div>
                    <div className="p-2 bg-purple-500/10 rounded-lg">
                        <Zap className="h-5 w-5 text-purple-500" />
                    </div>
                </div>
                <div className="mt-4 text-xs text-purple-400">
                    Saved ~2.5 hours
                </div>
            </Spotlight>
        </div>
    );
}
