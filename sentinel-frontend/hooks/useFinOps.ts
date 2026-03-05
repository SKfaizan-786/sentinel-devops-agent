'use client';

import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export interface FinOpsSummary {
    potentialSavingsMonthly: number;
    realizedSavingsMonthly: number;
    pendingRecommendations: number;
    appliedRecommendations: number;
    monitoredContainers: number;
    avgResourceUtilization: number;
    wastePercentage: number;
}

export interface FinOpsRecommendation {
    id: number;
    container_id: string;
    container_name: string;
    current_cpu_avg: number;
    current_memory_avg_mb: number;
    current_memory_limit_mb: number;
    recommended_memory_limit_mb: number;
    estimated_savings_monthly: number;
    reasoning: string;
    status: 'pending' | 'applied' | 'dismissed';
    created_at: string;
    updated_at: string;
}

export interface HeatmapEntry {
    container_id: string;
    container_name: string;
    avg_cpu: number;
    avg_memory: number;
    avg_memory_mb: number;
    avg_limit_mb: number;
}

export function useFinOps() {
    const [summary, setSummary] = useState<FinOpsSummary | null>(null);
    const [recommendations, setRecommendations] = useState<FinOpsRecommendation[]>([]);
    const [heatmapData, setHeatmapData] = useState<HeatmapEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [analyzing, setAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchAll = useCallback(async () => {
        try {
            const [summaryRes, recsRes, heatmapRes] = await Promise.all([
                axios.get(`${API_BASE}/api/finops/summary`),
                axios.get(`${API_BASE}/api/finops/recommendations`),
                axios.get(`${API_BASE}/api/finops/heatmap`),
            ]);
            setSummary(summaryRes.data);
            setRecommendations(recsRes.data.recommendations || []);
            setHeatmapData(heatmapRes.data.heatmap || []);
            setError(null);
        } catch (err) {
            console.warn('FinOps fetch error:', err);
            setError('Failed to load FinOps data');
        } finally {
            setLoading(false);
        }
    }, []);

    const analyze = useCallback(async () => {
        setAnalyzing(true);
        try {
            await axios.post(`${API_BASE}/api/finops/analyze`);
            await fetchAll();
        } catch (err) {
            console.warn('FinOps analyze error:', err);
            setError('Analysis failed');
        } finally {
            setAnalyzing(false);
        }
    }, [fetchAll]);

    const applyRecommendation = useCallback(async (id: number) => {
        try {
            await axios.post(`${API_BASE}/api/finops/recommendations/${id}/apply`);
            await fetchAll();
        } catch (err) {
            console.warn('FinOps apply error:', err);
            setError('Failed to apply recommendation');
        }
    }, [fetchAll]);

    const dismissRecommendation = useCallback(async (id: number) => {
        try {
            await axios.post(`${API_BASE}/api/finops/recommendations/${id}/dismiss`);
            await fetchAll();
        } catch (err) {
            console.warn('FinOps dismiss error:', err);
            setError('Failed to dismiss recommendation');
        }
    }, [fetchAll]);

    useEffect(() => {
        let timerId: NodeJS.Timeout;

        const poll = async () => {
            await fetchAll();
            timerId = setTimeout(poll, 30000);
        };

        poll();
        return () => clearTimeout(timerId);
    }, [fetchAll]);

    return {
        summary,
        recommendations,
        heatmapData,
        loading,
        analyzing,
        error,
        analyze,
        applyRecommendation,
        dismissRecommendation,
        refetch: fetchAll,
    };
}
