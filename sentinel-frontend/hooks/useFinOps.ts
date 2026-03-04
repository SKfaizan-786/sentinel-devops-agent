import { useState, useEffect, useCallback } from 'react';

export interface FinOpsReport {
    totalMonthlyEstimate: string;
    totalPotentialSavings: string;
    wastePercent: string | number;
    cloudPreset: string;
    containers: Array<{
        containerId: string;
        name: string;
        monthlyEstimate: number;
        avgCPUPercent: number | null;
        avgMemPercent: number | null;
        wasteClass: 'healthy' | 'idle' | 'over-provisioned' | 'zombie';
        potentialSavingsMonthly: number;
        recommendation: string;
    }>;
}

export function useFinOps(preset: string = 'aws') {
    const [data, setData] = useState<FinOpsReport | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchFinOps = useCallback(async (signal?: AbortSignal) => {
        try {
            setLoading(true);
            const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? '';
            const res = await fetch(`${baseUrl}/api/finops/summary?preset=${preset}`, { signal });
            if (!res.ok) throw new Error('Failed to fetch FinOps data');
            const json = await res.json();
            setData(json);
            setError(null);
        } catch (err: unknown) {
            if (err instanceof DOMException && err.name === 'AbortError') return;
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [preset]);

    useEffect(() => {
        const controller = new AbortController();
        fetchFinOps(controller.signal);
        return () => controller.abort();
    }, [fetchFinOps]);

    return { data, loading, error, refetch: fetchFinOps };
}
