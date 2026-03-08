"use client";

import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import Link from "next/link";

/**
 * Use an env-var for the API base URL so the app works in non-local deployments.
 * Fixes: hardcoded localhost:4000 in three places (fetch list, toggleEnabled, deleteRunbook).
 */
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface Runbook {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    triggers: unknown[];
    actions: unknown[];
    created_at: string;
    updated_at: string;
}

export default function RunbooksPage() {
    const [runbooks, setRunbooks] = useState<Runbook[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRunbooks = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await axios.get<{ runbooks: Runbook[] }>(`${API_URL}/api/runbooks`);
            setRunbooks(res.data.runbooks || []);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to load runbooks";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRunbooks();
    }, [fetchRunbooks]);

    const toggleEnabled = async (id: string, current: boolean) => {
        try {
            await axios.put(`${API_URL}/api/runbooks/${id}`, { enabled: !current });
            setRunbooks(prev =>
                prev.map(r => (r.id === id ? { ...r, enabled: !current } : r))
            );
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to update runbook";
            alert(message);
        }
    };

    const deleteRunbook = async (id: string) => {
        if (!confirm("Delete this runbook?")) return;
        try {
            await axios.delete(`${API_URL}/api/runbooks/${id}`);
            setRunbooks(prev => prev.filter(r => r.id !== id));
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : "Failed to delete runbook";
            alert(message);
        }
    };

    return (
        <div className="space-y-6 px-4 lg:px-6 py-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Runbooks</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Automated healing workflows triggered by incidents or schedules.
                    </p>
                </div>
                <Link
                    href="/dashboard/runbooks/builder"
                    className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                    + New Runbook
                </Link>
            </div>

            {loading ? (
                <p className="text-muted-foreground text-sm">Loading runbooks…</p>
            ) : error ? (
                <p className="text-red-400 text-sm">{error}</p>
            ) : runbooks.length === 0 ? (
                <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                    <p className="text-muted-foreground text-sm">No runbooks yet.</p>
                    <Link
                        href="/dashboard/runbooks/builder"
                        className="mt-4 inline-block text-primary text-sm hover:underline"
                    >
                        Create your first runbook →
                    </Link>
                </div>
            ) : (
                <ul className="space-y-3">
                    {runbooks.map(rb => (
                        <li
                            key={rb.id}
                            className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-center justify-between gap-4"
                        >
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-semibold text-foreground truncate">{rb.name}</span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full ${rb.enabled
                                                ? "bg-emerald-500/20 text-emerald-400"
                                                : "bg-neutral-500/20 text-neutral-400"
                                            }`}
                                    >
                                        {rb.enabled ? "enabled" : "disabled"}
                                    </span>
                                </div>
                                {rb.description && (
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{rb.description}</p>
                                )}
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    {rb.triggers.length} trigger{rb.triggers.length !== 1 ? "s" : ""} ·{" "}
                                    {rb.actions.length} action{rb.actions.length !== 1 ? "s" : ""}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Link
                                    href={`/dashboard/runbooks/builder?id=${rb.id}`}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    Edit
                                </Link>
                                <button
                                    onClick={() => toggleEnabled(rb.id, rb.enabled)}
                                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {rb.enabled ? "Disable" : "Enable"}
                                </button>
                                <button
                                    onClick={() => deleteRunbook(rb.id)}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
