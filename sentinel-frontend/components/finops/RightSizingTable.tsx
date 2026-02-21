"use client";

import { ArrowRight, ChevronRight } from 'lucide-react';

interface RightSizingTableProps {
    containers: Array<{
        name: string;
        wasteClass: string;
        potentialSavingsMonthly: number;
        recommendation: string;
        avgCPUPercent: number | null;
        avgMemPercent: number | null;
    }>;
}

export function RightSizingTable({ containers }: RightSizingTableProps) {
    const wasteful = containers.filter(c => c.wasteClass !== 'healthy');

    return (
        <div className="glass border border-border rounded-2xl overflow-hidden">
            <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold">Right-Sizing Recommendations</h3>
            </div>
            <div className="p-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="border-b border-border text-muted-foreground font-medium uppercase text-[10px] tracking-wider">
                                <th className="pb-3 px-2">Container</th>
                                <th className="pb-3 px-2">Efficiency</th>
                                <th className="pb-3 px-2">Classification</th>
                                <th className="pb-3 px-2">Recommendation</th>
                                <th className="pb-3 px-2 text-right">Potential Savings</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {wasteful.length > 0 ? (
                                wasteful.map((c, i) => (
                                    <tr key={c.name + i} className="group hover:bg-white/5 transition-colors">
                                        <td className="py-4 px-2 font-medium">{c.name}</td>
                                        <td className="py-4 px-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] text-muted-foreground uppercase">CPU {c.avgCPUPercent ?? '0'}%</span>
                                                <span className="text-[10px] text-muted-foreground uppercase">RAM {c.avgMemPercent ?? '0'}%</span>
                                            </div>
                                        </td>
                                        <td className="py-4 px-2">
                                            <span className={cn(
                                                "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                                c.wasteClass === 'idle' && "bg-orange-500/10 text-orange-500",
                                                c.wasteClass === 'over-provisioned' && "bg-yellow-500/10 text-yellow-500",
                                                c.wasteClass === 'zombie' && "bg-red-500/10 text-red-500",
                                            )}>
                                                {c.wasteClass}
                                            </span>
                                        </td>
                                        <td className="py-4 px-2 text-muted-foreground italic flex items-center gap-2">
                                            <ChevronRight className="w-3 h-3 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                                            {c.recommendation}
                                        </td>
                                        <td className="py-4 px-2 text-right text-green-500 font-bold">
                                            ${c.potentialSavingsMonthly.toFixed(2)}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                        All containers are correctly sized. Excellent!
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ');
}
