"use client";

import { useState, useEffect } from "react";
import { ServiceGrid } from "@/components/dashboard/ServiceGrid";
import { MetricsCharts } from "@/components/dashboard/MetricsCharts";
import { AgentReasoningPanel } from "@/components/dashboard/AgentReasoningPanel";
import { Service, Incident } from "@/lib/mockData";
import { ServiceMetrics } from "@/hooks/useMetrics";
import { Play, Pause, RotateCcw, ChevronRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/common/Button";
import { motion, AnimatePresence } from "framer-motion";

// --- Mock Data Factories ---

const createService = (id: string, name: string, status: Service["status"], latency: number, cpu: number, trend: number[]): Service => ({
    id, name, type: id === "primary-db" ? "database" : "api", status, uptime: 99.9, latency, cpu, memory: 50, trend
});

const createMetrics = (id: string, name: string, cpu: number, errorRate: number, responseTime: number): ServiceMetrics => ({
    id,
    name,
    currentCpu: cpu,
    currentErrorRate: errorRate,
    currentResponseTime: responseTime,
    history: Array(20).fill(0).map((_, i) => ({
        timestamp: new Date(Date.now() - (20 - i) * 1000).toLocaleTimeString(),
        value: responseTime,
        cpu,
        memory: 50,
        responseTime,
        errorRate,
        activeConnections: 100
    }))
});

// --- Scenario Steps ---

interface DemoStep {
    id: number;
    label: string;
    description: string;
    services: Service[];
    metrics: Record<string, ServiceMetrics>;
    incidents: Incident[];
    reasoning?: unknown;
    logs?: unknown[];
}

const steps: DemoStep[] = [
    {
        id: 0,
        label: "Normal Operations",
        description: "System is running smoothly. All services are healthy with low latency.",
        services: [
            createService("api-gateway", "API Gateway", "healthy", 45, 20, [40, 42, 45, 43, 44]),
            createService("auth-service", "Auth Service", "healthy", 25, 15, [22, 24, 25, 23, 25]),
            createService("primary-db", "Primary DB", "healthy", 12, 30, [10, 12, 12, 11, 12]),
        ],
        metrics: {
            "api-gateway": createMetrics("api-gateway", "API Gateway", 20, 0, 45),
            "auth-service": createMetrics("auth-service", "Auth Service", 15, 0, 25),
        },
        incidents: []
    },
    {
        id: 1,
        label: "Traffic Spike",
        description: "Sudden surge in traffic detected. Latency increasing on API Gateway.",
        services: [
            createService("api-gateway", "API Gateway", "degraded", 350, 85, [45, 60, 120, 250, 350]),
            createService("auth-service", "Auth Service", "healthy", 45, 40, [25, 30, 35, 40, 45]),
            createService("primary-db", "Primary DB", "healthy", 15, 35, [12, 13, 14, 15, 15]),
        ],
        metrics: {
            "api-gateway": createMetrics("api-gateway", "API Gateway", 85, 2, 350),
            "auth-service": createMetrics("auth-service", "Auth Service", 40, 0.5, 45),
        },
        incidents: []
    },
    {
        id: 2,
        label: "Service Failure",
        description: "Auth Service crashes due to memory limits. API Gateway returns 502s.",
        services: [
            createService("api-gateway", "API Gateway", "degraded", 800, 90, [350, 500, 750, 800, 800]),
            createService("auth-service", "Auth Service", "down", 0, 0, [45, 80, 0, 0, 0]),
            createService("primary-db", "Primary DB", "healthy", 12, 10, [15, 14, 12, 12, 12]),
        ],
        metrics: {
            "api-gateway": createMetrics("api-gateway", "API Gateway", 90, 15, 800),
            "auth-service": createMetrics("auth-service", "Auth Service", 0, 100, 0),
        },
        incidents: [
            {
                id: "INC-DEMO-01",
                title: "Auth Service Unresponsive",
                serviceId: "auth-service",
                status: "failed",
                severity: "critical",
                timestamp: new Date().toISOString(),
                duration: "2m",
                rootCause: "Health check failed - OOMKilled",
                agentAction: "Analyzing root cause",
                agentPredictionConfidence: 85,
                timeline: [{ time: "Now", event: "Service stopped responding to health checks.", icon: "🔴" }]
            }
        ],
        reasoning: {
            status: "analyzing",
            currentStep: "Analyzing Root Cause",
            logs: ["Scanning recent deployments...", "Checking pod metrics for auth-service...", "Found OOMKilled error in auth-service logs."]
        }
    },
    {
        id: 3,
        label: "AI Mitigation",
        description: "Sentinel Agent identifies OOM Error and initiates rollback & restart.",
        services: [
            createService("api-gateway", "API Gateway", "degraded", 400, 60, [800, 750, 600, 500, 400]),
            createService("auth-service", "Auth Service", "degraded", 120, 95, [0, 0, 100, 110, 120]), // Restarting/High CPU
            createService("primary-db", "Primary DB", "healthy", 15, 20, [12, 12, 13, 14, 15]),
        ],
        metrics: {
            "api-gateway": createMetrics("api-gateway", "API Gateway", 60, 5, 400),
            "auth-service": createMetrics("auth-service", "Auth Service", 95, 2, 120),
        },
        incidents: [
            {
                id: "INC-DEMO-01",
                title: "Auth Service Unresponsive",
                serviceId: "auth-service",
                status: "in-progress",
                severity: "critical",
                timestamp: new Date().toISOString(),
                duration: "4m",
                rootCause: "Memory leak in latest canary deployment",
                agentAction: "Rolling back to v4.5.2",
                agentPredictionConfidence: 92,
                timeline: [
                    { time: "Now", event: "Agent initiated rollback to previous stable deployment.", icon: "🔧" },
                    { time: "-2m", event: "Service stopped responding to health checks.", icon: "🔴" }
                ]
            }
        ],
        reasoning: {
            status: "mitigating",
            currentStep: "Executing Mitigation Strategy",
            logs: ["Identified memory leak in latest canary.", "Rolling back deployment to v4.5.2...", "Waiting for health checks to pass..."]
        }
    },
    {
        id: 4,
        label: "Recovery",
        description: "System stabilized. Incident marked as resolved.",
        services: [
            createService("api-gateway", "API Gateway", "healthy", 50, 25, [400, 200, 100, 60, 50]),
            createService("auth-service", "Auth Service", "healthy", 28, 18, [120, 80, 40, 30, 28]),
            createService("primary-db", "Primary DB", "healthy", 12, 30, [15, 14, 13, 12, 12]),
        ],
        metrics: {
            "api-gateway": createMetrics("api-gateway", "API Gateway", 25, 0, 50),
            "auth-service": createMetrics("auth-service", "Auth Service", 18, 0, 28),
        },
        incidents: [
            {
                id: "INC-DEMO-01",
                title: "Auth Service Unresponsive",
                serviceId: "auth-service",
                status: "resolved",
                severity: "info",
                timestamp: new Date().toISOString(),
                duration: "6m",
                rootCause: "Memory leak in latest canary deployment",
                agentAction: "Rolled back to v4.5.2",
                agentPredictionConfidence: 99,
                timeline: [
                    { time: "Now", event: "Service healthy. Incident closed.", icon: "✅" },
                    { time: "-2m", event: "Agent initiated rollback.", icon: "🔧" },
                    { time: "-6m", event: "Service unresponsive.", icon: "🔴" }
                ]
            }
        ],
        reasoning: {
            status: "idle",
            currentStep: "Monitoring",
            logs: ["Mitigation successful.", "System health restored.", "Post-mortem report generated."]
        }
    }
];

export default function DemoPage() {
    const [currentStepIndex, setCurrentStepIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isPlaying) {
            interval = setInterval(() => {
                setCurrentStepIndex((prev) => {
                    if (prev >= steps.length - 1) {
                        setIsPlaying(false);
                        return prev;
                    }
                    return prev + 1;
                });
            }, 5000); // 5 seconds per step
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    const currentStep = steps[currentStepIndex];

    return (
        <div className="container mx-auto p-6 max-w-[1600px] pb-24">
            {/* Header & Controls */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8 sticky top-20 z-30 bg-[#0a0a0a]/90 backdrop-blur-md py-4 border-b border-white/5">
                <div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-purple-400">
                        Interactive Demo
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Witness Sentinel&apos;s self-healing capabilities in real-time.
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-full p-2 pr-6">
                    <Button
                        size="icon"
                        variant={isPlaying ? "outline" : "default"}
                        className="rounded-full h-10 w-10 shrink-0"
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                    </Button>

                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Current Scenario</span>
                        <span className="text-sm font-medium text-white min-w-[150px]">{currentStep.label}</span>
                    </div>

                    <div className="h-8 w-[1px] bg-white/10 mx-2" />

                    <div className="flex gap-1">
                        {steps.map((step, idx) => (
                            <button
                                key={step.id}
                                onClick={() => {
                                    setCurrentStepIndex(idx);
                                    setIsPlaying(false);
                                }}
                                className={`h-2 w-8 rounded-full transition-all ${idx === currentStepIndex
                                    ? "bg-primary shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                                    : idx < currentStepIndex
                                        ? "bg-primary/30"
                                        : "bg-white/10 hover:bg-white/20"
                                    }`}
                                title={step.label}
                            />
                        ))}
                    </div>
                    <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full h-8 w-8 ml-2 text-muted-foreground hover:text-white"
                        onClick={() => setCurrentStepIndex(0)}
                        title="Reset Demo"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Context Banner */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentStep.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mb-8 p-4 bg-primary/5 border border-primary/20 rounded-xl flex items-start gap-4"
                >
                    <div className="bg-primary/20 p-2 rounded-full mt-1">
                        <ChevronRight className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="font-bold text-lg text-white mb-1">{currentStep.label}</h3>
                        <p className="text-gray-300">{currentStep.description}</p>
                    </div>
                </motion.div>
            </AnimatePresence>

            {/* Dashboard Mockup Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Left Column: Services & Reasoning (Same as Dashboard) */}
                <div className="xl:col-span-3 space-y-6">
                    <ServiceGrid services={currentStep.services} />

                    {/* Charts */}
                    <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-white mb-4">Real-time Metrics</h3>
                        <MetricsCharts metrics={currentStep.metrics} />
                    </div>
                </div>

                {/* Right Column: Timeline & Incidents */}
                <div className="space-y-6">
                    {/* Agent Reasoning (Appears if active and incident exists) */}
                    {!!currentStep.reasoning && currentStep.incidents.length > 0 && (
                        <div className="mb-6">
                            <AgentReasoningPanel
                                incident={currentStep.incidents[0]}
                            />
                        </div>
                    )}

                    {/* Incident Timeline */}
                    <div className="bg-[#0c0c0c] border border-white/10 rounded-xl p-6 h-full">
                        <h3 className="text-lg font-semibold text-white mb-4">Safety Systems</h3>
                        {currentStep.incidents.length > 0 ? (
                            <div className="space-y-4">
                                {currentStep.incidents.map(inc => (
                                    <div key={inc.id} className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                            <span className="font-bold text-red-400 text-sm">{inc.title}</span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mb-3">{inc.rootCause}</p>
                                        <div className="text-xs font-mono text-white/50 border-t border-white/5 pt-2 mt-2">
                                            {inc.timeline?.map((t, i) => (
                                                <div key={i} className="flex justify-between py-0.5">
                                                    <span>{t.event}</span>
                                                    <span className="opacity-50">{t.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground opacity-50">
                                <CheckCircle2 className="h-12 w-12 mb-4 text-green-500/50" />
                                <p>All Systems Nominal</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
