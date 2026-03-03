import { useEffect, useState, useCallback } from 'react';

export type RefreshInterval = '5s' | '10s' | '30s' | '1m' | '5m';

interface UseAutoRefreshProps {
    onRefresh: () => void;
    intervalPreference?: RefreshInterval;
}

const INTERVAL_MAP: Record<RefreshInterval, number> = {
    '5s': 5000,
    '10s': 10000,
    '30s': 30000,
    '1m': 60000,
    '5m': 300000,
};

export function useAutoRefresh({ onRefresh, intervalPreference = '30s' }: UseAutoRefreshProps) {
    // Always start with consistent defaults to avoid hydration mismatch
    const [enabled, setEnabled] = useState(false);
    const [interval, setInterval] = useState<RefreshInterval>(intervalPreference);

    // Sync from localStorage after mount (client-only)
    useEffect(() => {
        const storedEnabled = localStorage.getItem('autoRefreshEnabled');
        if (storedEnabled === 'true') setEnabled(true);

        const storedInterval = localStorage.getItem('autoRefreshInterval') as RefreshInterval | null;
        if (storedInterval && storedInterval in INTERVAL_MAP) setInterval(storedInterval);
    }, []);

    const [isPageHidden, setIsPageHidden] = useState(false);

    // Handle page visibility
    useEffect(() => {
        const handleVisibilityChange = () => {
            setIsPageHidden(document.hidden);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    // Auto-refresh interval
    useEffect(() => {
        // Determine if we should refresh
        if (!enabled || isPageHidden) return;

        const intervalMs = INTERVAL_MAP[interval];
        const timerId = window.setInterval(() => {
            onRefresh();
        }, intervalMs);

        return () => clearInterval(timerId);
    }, [enabled, interval, isPageHidden, onRefresh]);

    // Persist preferences
    const updateEnabled = useCallback((value: boolean) => {
        setEnabled(value);
        localStorage.setItem('autoRefreshEnabled', String(value));
    }, []);

    const updateInterval = useCallback((value: RefreshInterval) => {
        setInterval(value);
        localStorage.setItem('autoRefreshInterval', value);
    }, []);

    const manualRefresh = useCallback(() => {
        onRefresh();
    }, [onRefresh]);

    return {
        enabled,
        updateEnabled,
        interval,
        updateInterval,
        isPageHidden,
        manualRefresh,
    };
}
