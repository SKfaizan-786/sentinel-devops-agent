import { useState, useEffect } from 'react';

export interface FinOpsReport {
    totalMonthlyEstimate: string;
    totalPotentialSavings: string;
    wastePercent: string;
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

    const fetchFinOps = async () => {
        try {
            setLoading(true);
            const res = await fetch(`http://localhost:4000/api/finops/summary?preset=${preset}`);
            if (!res.ok) throw new Error('Failed to fetch FinOps data');
            const json = await res.json();
            setData(json);
            setError(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinOps();
    }, [preset]);

    return { data, loading, error, refetch: fetchFinOps };
}
