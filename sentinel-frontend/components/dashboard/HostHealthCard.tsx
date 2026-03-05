"use client";

import React from 'react';
import { Server, Container, Cpu, HardDrive, AlertCircle, CheckCircle, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { Spotlight } from "@/components/common/Spotlight";

export interface HostHealth {
    id: string;
    label: string;
    type: 'local' | 'remote' | 'tcp' | 'ssh';
    status: 'connected' | 'disconnected';
    error?: string;
    swarmActive?: boolean;
    dockerVersion?: string;
    containers?: number;
    containersRunning?: number;
    containersPaused?: number;
    containersStopped?: number;
    images?: number;
    memoryTotal?: number;
    cpuCount?: number;
    lastChecked?: string;
}

interface HostHealthCardProps {
    host: HostHealth;
    onClick?: () => void;
    selected?: boolean;
}

function formatBytes(bytes: number): string {
    if (bytes === undefined || bytes === null || !Number.isFinite(bytes) || bytes < 0) return 'N/A';
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const safeIndex = Math.min(Math.max(i, 0), sizes.length - 1);
    return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(1)) + ' ' + sizes[safeIndex];
}

export function HostHealthCard({ host, onClick, selected }: HostHealthCardProps) {
    const isConnected = host.status === 'connected';

    return (
        <Spotlight
            className={cn(
                "p-4 bg-card border-border transition-all cursor-pointer",
                selected && "ring-2 ring-primary",
                !isConnected && "opacity-75"
            )}
            onClick={onClick}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className={cn(
                        "p-2 rounded-lg border",
                        isConnected
                            ? "bg-green-500/10 border-green-500/20"
                            : "bg-red-500/10 border-red-500/20"
                    )}>
                        <Server className={cn(
                            "h-5 w-5",
                            isConnected ? "text-green-500" : "text-red-500"
                        )} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-foreground">{host.label}</h4>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                            {host.type === 'local' ? 'Local Socket' : host.type.toUpperCase()}
                            {host.swarmActive && (
                                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] bg-blue-500/10 text-blue-500 border border-blue-500/20">
                                    Swarm
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {isConnected ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                        <WifiOff className="h-4 w-4 text-red-500" />
                    )}
                </div>
            </div>

            {isConnected ? (
                <div className="grid grid-cols-3 gap-2">
                    <div className="p-2 rounded bg-muted">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                            <Container className="h-3 w-3" />
                            Containers
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                            {host.containersRunning || 0}
                            <span className="text-xs text-muted-foreground font-normal">
                                /{host.containers || 0}
                            </span>
                        </p>
                    </div>
                    <div className="p-2 rounded bg-muted">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                            <Cpu className="h-3 w-3" />
                            CPUs
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                            {host.cpuCount || 0}
                        </p>
                    </div>
                    <div className="p-2 rounded bg-muted">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase tracking-wider">
                            <HardDrive className="h-3 w-3" />
                            Memory
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                            {formatBytes(host.memoryTotal || 0)}
                        </p>
                    </div>
                </div>
            ) : (
                <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 text-red-500">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm font-medium">Connection Failed</span>
                    </div>
                    {host.error && (
                        <p className="mt-1 text-xs text-red-400 truncate" title={host.error}>
                            {host.error}
                        </p>
                    )}
                </div>
            )}

            {host.dockerVersion && (
                <p className="mt-3 text-[10px] text-muted-foreground">
                    Docker {host.dockerVersion}
                </p>
            )}
        </Spotlight>
    );
}
