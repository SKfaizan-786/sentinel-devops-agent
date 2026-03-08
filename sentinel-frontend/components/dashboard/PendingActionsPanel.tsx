"use client";

import { useState } from "react";
import { PendingAction } from "@/hooks/usePendingActions";

interface PendingActionsPanelProps {
    actions: PendingAction[];
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => Promise<void>;
}

const serviceIcons: Record<string, string> = {
    auth: "🔐",
    payment: "💳",
    notification: "🔔",
};

const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
    approved: "bg-green-100 text-green-800 border-green-300",
    rejected: "bg-red-100 text-red-800 border-red-300",
};

export function PendingActionsPanel({ actions, onApprove, onReject }: PendingActionsPanelProps) {
    const [processingId, setProcessingId] = useState<string | null>(null);

    const pendingCount = actions.filter(a => a.status === "pending").length;

    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            await onApprove(id);
        } finally {
            setProcessingId(null);
        }
    };

    const handleReject = async (id: string) => {
        setProcessingId(id);
        try {
            await onReject(id);
        } finally {
            setProcessingId(null);
        }
    };

    if (actions.length === 0) return null;

    return (
        <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                    🛡️ Pending Actions
                    {pendingCount > 0 && (
                        <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs font-bold animate-pulse">
                            {pendingCount} awaiting
                        </span>
                    )}
                </h2>
            </div>
            <div className="space-y-3">
                {actions.map((action) => (
                    <div
                        key={action.id}
                        className={`rounded-lg border p-4 transition-all duration-200 ${action.status === "pending"
                            ? "border-yellow-300 bg-yellow-50/50 dark:bg-yellow-900/10 dark:border-yellow-700"
                            : action.status === "approved"
                                ? "border-green-300 bg-green-50/50 dark:bg-green-900/10 dark:border-green-700 opacity-70"
                                : "border-red-300 bg-red-50/50 dark:bg-red-900/10 dark:border-red-700 opacity-70"
                            }`}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">{serviceIcons[action.service] || "🔧"}</span>
                                    <span className="font-semibold text-foreground capitalize">
                                        {action.action} {action.service}
                                    </span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusColors[action.status] || ""
                                            }`}
                                    >
                                        {action.status}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground">{action.reason}</p>
                                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                    <span>Created: {new Date(action.createdAt).toLocaleString()}</span>
                                    {action.containerId && (
                                        <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[10px]">
                                            {action.containerId.slice(0, 12)}
                                        </span>
                                    )}
                                </div>
                                {action.resolvedBy && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {action.status === "approved" ? "Approved" : "Rejected"} by {action.resolvedBy}
                                    </p>
                                )}
                            </div>

                            {action.status === "pending" && (
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        onClick={() => handleApprove(action.id)}
                                        disabled={processingId === action.id}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {processingId === action.id ? "..." : "✅ Approve"}
                                    </button>
                                    <button
                                        onClick={() => handleReject(action.id)}
                                        disabled={processingId === action.id}
                                        className="px-3 py-1.5 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {processingId === action.id ? "..." : "❌ Reject"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
