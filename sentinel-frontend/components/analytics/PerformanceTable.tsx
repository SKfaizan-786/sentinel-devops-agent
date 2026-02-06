"use client";

import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { getStatusColor } from "@/lib/theme"; // Import theme helper

interface ServiceMetric {
    id: string;
    name: string;
    p95: number;
    p99: number;
    change: number;
}

const metrics: ServiceMetric[] = [
    { id: "1", name: "auth-service", p95: 124, p99: 450, change: 12 },
    { id: "2", name: "api-gateway", p95: 45, p99: 80, change: -5 },
    { id: "3", name: "payment-worker", p95: 320, p99: 890, change: 2.5 },
    { id: "4", name: "notification-svc", p95: 85, p99: 120, change: 0 },
    { id: "5", name: "search-index", p95: 180, p99: 310, change: -15 },
];

export function PerformanceTable() {
    const criticalColor = getStatusColor('critical');
    const healthyColor = getStatusColor('healthy');

    return (
        <div className="w-full">
            <div className="grid grid-cols-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
                <div>Service</div>
                <div className="text-right">P95 (ms)</div>
                <div className="text-right">P99 (ms)</div>
                <div className="text-right">24h Trend</div>
            </div>
            <div className="space-y-1">
                {metrics.map((m) => (
                    <div key={m.id} className="grid grid-cols-4 items-center p-2 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                        <div className="font-mono text-sm text-white">{m.name}</div>
                        <div className="text-right font-mono text-sm text-muted-foreground">{m.p95}</div>
                        <div className={`text-right font-mono text-sm ${m.p99 > 500 ? `${criticalColor.text} font-bold` : "text-muted-foreground"}`}>{m.p99}</div>
                        {m.change > 0 && <span className={`flex items-center text-xs ${criticalColor.text}`}><ArrowUpRight className="h-3 w-3 mr-1" />{m.change}%</span>}
                        {m.change < 0 && <span className={`flex items-center text-xs ${healthyColor.text}`}><ArrowDownRight className="h-3 w-3 mr-1" />{Math.abs(m.change)}%</span>}
                        {m.change === 0 && <span className="flex items-center text-xs text-muted-foreground"><Minus className="h-3 w-3 mr-1" />-</span>}
                    </div>
                ))}
            </div>
        </div>
    );
}
