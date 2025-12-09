"use client";

import { Service } from "@/lib/mockData";
import { MoreHorizontal, Cloud, Database, Server, Shield, Zap } from "lucide-react";
import { Button } from "@/components/common/Button";
import { cn } from "@/lib/utils";
import { Spotlight } from "@/components/common/Spotlight";

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
    const color = {
        healthy: "bg-green-500",
        degraded: "bg-yellow-500",
        down: "bg-red-500",
    }[status];

    return (
        <div className="relative flex h-3 w-3">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", color)}></span>
            <span className={cn("relative inline-flex rounded-full h-3 w-3", color)}></span>
        </div>
    );
};

export function ServiceCard({ service }: { service: Service }) {
    return (
        <Spotlight className="p-5 bg-white/5 border-white/5 hover:border-primary/20 transition-all group">
            <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5">
                        <ServiceIcon type={service.type} />
                    </div>
                    <div>
                        <h4 className="font-semibold text-sm text-white">{service.name}</h4>
                        <div className="flex items-center gap-2 mt-1">
                            <StatusDot status={service.status} />
                            <span className="text-xs text-muted-foreground capitalize">{service.status}</span>
                        </div>
                    </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-white">
                    <MoreHorizontal className="h-4 w-4" />
                </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="p-2 rounded bg-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Uptime</p>
                    <p className="text-sm font-mono text-white">{service.uptime}%</p>
                </div>
                <div className="p-2 rounded bg-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Latency</p>
                    <p className="text-sm font-mono text-white">{service.latency}ms</p>
                </div>
                <div className="p-2 rounded bg-white/5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CPU</p>
                    <p className="text-sm font-mono text-white">{service.cpu}%</p>
                </div>
            </div>

            {/* Mini Sparkline (SVG) */}
            <div className="h-12 w-full flex items-end gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                {service.trend.map((value, i) => (
                    <div
                        key={i}
                        className="flex-1 bg-primary/20 rounded-t-sm hover:bg-primary/60 transition-colors"
                        style={{ height: `${value}%` }}
                    />
                ))}
            </div>
        </Spotlight>
    );
}
