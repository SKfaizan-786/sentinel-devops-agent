import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface PendingAction {
    id: string;
    service: string;
    action: string;
    containerId: string | null;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: string;
    resolvedAt: string | null;
    resolvedBy: string | null;
    result?: { success: boolean; reason?: string };
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function usePendingActions(options: { manual?: boolean } = {}) {
    const { manual } = options;
    const [actions, setActions] = useState<PendingAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchActions = useCallback(async () => {
        try {
            const response = await axios.get(`${API_BASE}/api/approvals/pending`);
            setActions(response.data.actions || []);
            setError(null);
        } catch (err: unknown) {
            console.error("Failed to fetch pending actions:", err);
            const message = err instanceof Error ? err.message : "Failed to load pending actions";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const approveAction = useCallback(async (id: string) => {
        try {
            await axios.post(`${API_BASE}/api/approvals/${id}/approve`);
            await fetchActions();
        } catch (err: unknown) {
            console.error("Failed to approve action:", err);
            const message = err instanceof Error ? err.message : "Failed to approve action";
            setError(message);
            throw err;
        }
    }, [fetchActions]);

    const rejectAction = useCallback(async (id: string) => {
        try {
            await axios.post(`${API_BASE}/api/approvals/${id}/reject`);
            await fetchActions();
        } catch (err: unknown) {
            console.error("Failed to reject action:", err);
            const message = err instanceof Error ? err.message : "Failed to reject action";
            setError(message);
            throw err;
        }
    }, [fetchActions]);

    useEffect(() => {
        fetchActions();

        let interval: NodeJS.Timeout;
        if (!manual) {
            interval = setInterval(fetchActions, 5000);
        }

        return () => {
            if (interval) clearInterval(interval);
        };
    }, [manual, fetchActions]);

    return {
        actions,
        loading,
        error,
        approveAction,
        rejectAction,
        refetch: fetchActions
    };
}
