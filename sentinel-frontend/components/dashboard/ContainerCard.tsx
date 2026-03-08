"use client";

import React, { memo } from 'react';
import { Container } from '../../hooks/useContainers';
import { Box, RefreshCw, Layers, Calendar, Network } from "lucide-react";
import { Button } from "@/components/common/Button";
import { cn } from "@/lib/utils";
import { Spotlight } from "@/components/common/Spotlight";
import { Sparkline } from "@/components/common/Sparkline";

interface ContainerCardProps {
    container: Container;
    onRestart: (id: string) => void;
}

const StatusDot = memo(({ status }: { status: "healthy" | "unhealthy" | "unknown" }) => {
    const color = {
        healthy: "bg-green-500",
        unknown: "bg-gray-500",
        unhealthy: "bg-red-500",
    }[status] || "bg-gray-500";

    return (
        <div className="relative flex h-3 w-3">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", color)}></span>
            <span className={cn("relative inline-flex rounded-full h-3 w-3", color)}></span>
        </div>
    );
});

StatusDot.displayName = "StatusDot";

export const ContainerCard = memo(function ContainerCard({ container, onRestart }: ContainerCardProps) {
    const isHealthy = container.health === 'healthy';
    const [isRestarting, setIsRestarting] = React.useState(false);

    // Stable mock trend data using useMemo to avoid re-calculating on every render
    const mockTrend = React.useMemo(() =>
        Array.from({ length: 12 }, () => 20 + Math.random() * 10),
        []);

    const handleRestart = async () => {
        if (isRestarting) return;
        setIsRestarting(true);
        try {
            await Promise.resolve(onRestart(container.id));
        } finally {
            setIsRestarting(false);
        }
    };

    return (
        <Spotlight className="p-5 bg-card border-border hover:border-primary/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted border border-border">
                        <Box className={`h-4 w-4 ${isHealthy ? 'text-primary' : 'text-red-500'}`} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-foreground">{container.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <StatusDot status={container.health} />
                            <span className="text-xs text-muted-foreground capitalize">{container.health}</span>
                        </div>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                    disabled={isRestarting}
                    onClick={handleRestart}
                    title={isRestarting ? "Restarting..." : "Restart Container"}
                >
                    <RefreshCw className={cn("h-4 w-4", isRestarting && "animate-spin")} />
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 rounded bg-muted overflow-hidden">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Layers size={10} /> Image
                    </p>
                    <p className="text-sm font-mono text-foreground truncate" title={container.image}>
                        {container.image}
                    </p>
                </div>
                <div className="p-2 rounded bg-muted overflow-hidden">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar size={10} /> Created at
                    </p>
                    <p className="text-sm font-mono text-foreground truncate">
                        {new Date(container.created).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })}
                    </p>
                </div>
                <div className="p-2 rounded bg-muted overflow-hidden">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Network size={10} /> Port
                    </p>
                    <p className="text-sm font-mono text-foreground truncate">
                        {container.ports && container.ports.length > 0 ? container.ports[0].PublicPort || container.ports[0].PrivatePort : 'N/A'}
                    </p>
                </div>
            </div>

            <div className="h-10 w-full opacity-50 group-hover:opacity-100 transition-opacity mt-2">
                <Sparkline
                    data={mockTrend.map(val => ({ value: val }))}
                    color={isHealthy ? "#22d3ee" : "#ef4444"}
                    height={40}
                />
            </div>
        </Spotlight>
    );
});

ContainerCard.displayName = "ContainerCard";
