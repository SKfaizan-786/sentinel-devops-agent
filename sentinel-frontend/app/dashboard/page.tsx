"use client";

import { HealthSummary } from "@/components/dashboard/HealthSummary";
import { ServiceGrid } from "@/components/dashboard/ServiceGrid";
import { MetricsCharts } from "@/components/dashboard/MetricsCharts";
import { IncidentTimeline } from "@/components/dashboard/IncidentTimeline";
import { AgentReasoningPanel } from "@/components/dashboard/AgentReasoningPanel";
import { mockMetrics, mockServices } from "@/lib/mockData";
import { useMetrics } from "@/hooks/useMetrics";
import { useIncidents } from "@/hooks/useIncidents";
import { useEffect, useState } from "react";
import { useContainers } from "@/hooks/useContainers";
import { ContainerCard } from "@/components/dashboard/ContainerCard";

export default function DashboardPage() {
    const { metrics } = useMetrics();
    const { incidents, activeIncidentId, setActiveIncidentId } = useIncidents();
    const { containers, restartContainer } = useContainers();
    const [liveServices, setLiveServices] = useState(mockServices);

    // Merge real-time metrics into services
    useEffect(() => {
        setLiveServices(prev => prev.map(service => {
            const realTime = metrics[service.id];
            // Find base service to reset uptime when healthy
            const baseService = mockServices.find(s => s.id === service.id) || service;

            if (realTime) {
                const newTrend = realTime.history.length > 0
                    ? realTime.history.slice(-12).map(p => p.responseTime || 0)
                    : baseService.trend;

                const isDown = realTime.currentErrorRate > 0.5;
                // Recover uptime if healthy, drop if down
                const currentUptime = isDown
                    ? Math.max(0, baseService.uptime - 20)
                    : baseService.uptime;

                return {
                    ...service,
                    latency: realTime.currentResponseTime,
                    cpu: realTime.currentCpu,
                    uptime: currentUptime.toFixed(2) as any,
                    status: isDown ? "down" : (realTime.currentErrorRate > 0.2 ? "degraded" : "healthy"),
                    trend: newTrend.length > 0 ? newTrend : baseService.trend,
                };
            }
            return service;
        }));
    }, [metrics]);

    const activeIncident = incidents.find(i => i.id === activeIncidentId);

    // Calculate real-time stats
    const totalServices = liveServices.length;
    const healthyServices = liveServices.filter(s => s.status === "healthy").length;
    const realUptime = totalServices > 0 ? Math.round((healthyServices / totalServices) * 100) : 100;

    return (
        <div className="space-y-8 pb-20">
            <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2 text-foreground">Dashboard</h1>
                <p className="text-muted-foreground">Real-time overview of your system health and agent activities.</p>
            </div>

            <HealthSummary
                uptime={realUptime}
                servicesUp={healthyServices}
                totalServices={totalServices}
                activeIncidents={incidents.filter(i => i.status !== "resolved").length}
            />

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Charts & Services (2/3 width) */}
                <div className="lg:col-span-2 space-y-8">
                    <MetricsCharts metrics={metrics} />

                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-foreground">Monitored Services</h2>
                            <span className="text-sm text-muted-foreground flex items-center gap-2">
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                </span>
                                Live Updates
                            </span>
                        </div>
                        <ServiceGrid services={liveServices} />
                    </div>

                    {/* Docker Containers Section */}
                    {containers.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-semibold text-foreground">Docker Containers</h2>
                                <span className="text-sm text-muted-foreground flex items-center gap-2">
                                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                                        {containers.length} Running
                                    </span>
                                </span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {containers.map(container => (
                                    <ContainerCard
                                        key={container.id}
                                        container={container}
                                        onRestart={restartContainer}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Timeline & Reasoning (1/3 width) */}
                <div className="space-y-8">
                    {/* Agent Reasoning (Sticky if active) */}
                    {activeIncident && (
                        <div className="animate-in fade-in slide-in-from-right duration-500">
                            <div className="flex items-center justify-between mb-2">
                                <h2 className="text-lg font-semibold text-primary">Sentinel AI Analysis</h2>
                                <button
                                    onClick={() => setActiveIncidentId(null)}
                                    className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                    Close
                                </button>
                            </div>
                            <AgentReasoningPanel incident={activeIncident} />
                        </div>
                    )}

                    <div>
                        <h2 className="text-xl font-semibold text-foreground mb-4">Incident Timeline</h2>
                        <IncidentTimeline
                            incidents={incidents}
                            onViewReasoning={(id) => setActiveIncidentId(id)}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

