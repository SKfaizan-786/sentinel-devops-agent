"use client";

import { HealthSummary } from "@/components/dashboard/HealthSummary";
import { ServiceGrid } from "@/components/dashboard/ServiceGrid";
import { MetricsCharts } from "@/components/dashboard/MetricsCharts";
import { IncidentTimeline } from "@/components/dashboard/IncidentTimeline";
import { AgentReasoningPanel } from "@/components/dashboard/AgentReasoningPanel";
import { mockServices } from "@/lib/mockData";
import { useMetrics } from "@/hooks/useMetrics";
import { useNotifications } from "@/hooks/useNotifications";
import { useIncidents } from "@/hooks/useIncidents";

import { useContainers } from "@/hooks/useContainers";
import { ContainerCard } from "@/components/dashboard/ContainerCard";
import { useMemo, useState, useEffect, useRef } from "react";
import { Skeleton } from "@/components/common/Skeleton";
import { MetricsChartsSkeleton } from "@/components/dashboard/ChartSkeleton";
import { ServiceGridSkeleton } from "@/components/dashboard/ServiceCardSkeleton";
import { IncidentTimelineSkeleton } from "@/components/dashboard/IncidentTimelineSkeleton";

export default function DashboardPage() {
    const { metrics, status: metricsStatus } = useMetrics();
    const { incidents, activeIncidentId, setActiveIncidentId } = useIncidents();
    const { containers, loading: containersLoading, restartContainer } = useContainers();

    // Track initial load state (skeletons shown only on first load)
    const [initialLoad, setInitialLoad] = useState(true);

    useEffect(() => {
        // Clear initial load after first data arrives
        if (metricsStatus === "connected" && initialLoad) {
            // Small delay to prevent flash
            const timer = setTimeout(() => setInitialLoad(false), 300);
            return () => clearTimeout(timer);
        }
    }, [metricsStatus, initialLoad]);

    const isLoading = initialLoad;

    const liveServices = useMemo(() => {
        return mockServices.map(service => {
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
                    uptime: Number(currentUptime.toFixed(2)),
                    status: (isDown ? "down" : (realTime.currentErrorRate > 0.2 ? "degraded" : "healthy")) as "down" | "degraded" | "healthy",
                    trend: newTrend.length > 0 ? newTrend : baseService.trend,
                };
            }
            return service;
        });
    }, [metrics]);

    const { addNotification } = useNotifications();
    const prevStatuses = useRef<Record<string, string>>({});

    useEffect(() => {
        liveServices.forEach(service => {
            const prevStatus = prevStatuses.current[service.id];
            const currentStatus = service.status;

            if (prevStatus && prevStatus !== "down" && currentStatus === "down") {
                addNotification({
                    type: "incident",
                    title: `Service Down: ${service.name}`,
                    message: `${service.name} is not responding as of ${new Date().toLocaleTimeString()}`,
                });
            } else if (prevStatus === "down" && currentStatus !== "down") {
                addNotification({
                    type: "resolved",
                    title: `Service Restored: ${service.name}`,
                    message: `${service.name} is back online and healthy.`,
                });
            }
            
            prevStatuses.current[service.id] = currentStatus;
        });
    }, [liveServices, addNotification]);

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

            {/* Health Summary - Show skeleton during initial load */}
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="p-4 rounded-xl bg-card border border-border">
                            <Skeleton variant="text" className="w-20 h-3 mb-2" />
                            <Skeleton variant="text" className="w-16 h-8" />
                        </div>
                    ))}
                </div>
            ) : (
                <HealthSummary
                    uptime={realUptime}
                    servicesUp={healthyServices}
                    totalServices={totalServices}
                    activeIncidents={incidents.filter(i => i.status !== "resolved").length}
                />
            )}

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Charts & Services (2/3 width) */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Metrics Charts */}
                    {isLoading ? (
                        <MetricsChartsSkeleton />
                    ) : (
                        <MetricsCharts metrics={metrics} />
                    )}

                    {/* Services Section */}
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
                        {isLoading ? (
                            <ServiceGridSkeleton count={6} />
                        ) : (
                            <ServiceGrid services={liveServices} />
                        )}
                    </div>

                    {/* Docker Containers Section */}
                    {containersLoading ? (
                        <div>
                            <div className="flex items-center justify-between mb-4">
                                <Skeleton variant="text" className="w-36 h-6" />
                                <Skeleton variant="rectangular" className="w-24 h-6 rounded" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[1, 2].map((i) => (
                                    <div key={i} className="p-4 rounded-xl bg-card border border-border">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Skeleton variant="circular" width={40} height={40} />
                                            <div className="space-y-2 flex-1">
                                                <Skeleton variant="text" className="w-24" />
                                                <Skeleton variant="text" className="w-16" />
                                            </div>
                                        </div>
                                        <Skeleton variant="text" className="w-full mb-2" />
                                        <Skeleton variant="text" className="w-3/4" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : containers.length > 0 && (
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

                    {/* Incident Timeline */}
                    <div>
                        <h2 className="text-xl font-semibold text-foreground mb-4">Incident Timeline</h2>
                        {isLoading ? (
                            <IncidentTimelineSkeleton count={3} />
                        ) : (
                            <IncidentTimeline
                                incidents={incidents}
                                onViewReasoning={(id) => setActiveIncidentId(id)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
