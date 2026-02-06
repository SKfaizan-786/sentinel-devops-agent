"use client";

import { Service } from "@/lib/mockData";
import { getStatusColor } from "@/lib/theme";
import { MoreHorizontal, Cloud, Database, Server, Shield, Zap } from "lucide-react";
import { Button } from "@/components/common/Button";
import { cn } from "@/lib/utils";
import { Spotlight } from "@/components/common/Spotlight";
import { Sparkline } from "@/components/common/Sparkline";

const ServiceIcon = ({ type }: { type: Service["type"] }) => {
    switch (type) {
        case "api": return <Cloud className="h-4 w-4 text-primary" />;
        case "database": return <Database className="h-4 w-4 text-blue-500" />;
        case "worker": return <Server className="h-4 w-4 text-purple-500" />;
        case "cache": return <Zap className="h-4 w-4 text-yellow-500" />;
        default: return <Shield className="h-4 w-4 text-muted-foreground" />;
    }
};

const StatusDot = ({ status }: { status: Service["status"] }) => {
    const themeColor = getStatusColor(status);

    // Map theme properties to what the component expects if needed, or simply use theme properties directly.
    // The theme object return by getStatusColor has 'bg' (bg-color/20), 'text' (text-color), 'border', 'dot' (bg-color).
    // The original code used "bg-green-500". The theme 'dot' property is "bg-green-500".

    return (
        <div className="relative flex h-3 w-3">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", themeColor.dot)}></span>
            <span className={cn("relative inline-flex rounded-full h-3 w-3", themeColor.dot)}></span>
        </div>
    );
};

export function ServiceCard({ service }: { service: Service }) {
    return (
        <Spotlight className="p-5 bg-card border-border hover:border-primary/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-muted border border-border">
                        <ServiceIcon type={service.type} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-foreground">{service.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <StatusDot status={service.status} />
                            <span className="text-xs text-muted-foreground capitalize">{service.status}</span>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 rounded bg-muted">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Uptime</p>
                    <p className="text-sm font-mono text-foreground">{service.uptime}%</p>
                </div>
                <div className="p-2 rounded bg-muted">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Latency</p>
                    <p className="text-sm font-mono text-foreground">{service.latency}ms</p>
                </div>
                <div className="p-2 rounded bg-muted">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CPU</p>
                    <p className="text-sm font-mono text-foreground">{service.cpu}%</p>
                </div>
            </div>

            {/* Mini Sparkline */}
            <div className="h-10 w-full opacity-50 group-hover:opacity-100 transition-opacity mt-2">
                <Sparkline
                    data={service.trend.map(val => ({ value: val }))}
                    color={service.status === "healthy" ? "#22d3ee" : (service.status === "degraded" ? "#fbbf24" : "#ef4444")}
                    height={40}
                />
            </div>
        </Spotlight>
    );
}
