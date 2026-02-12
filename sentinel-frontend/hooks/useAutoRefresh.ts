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
    const [enabled, setEnabled] = useState(() => {
        if (typeof window === 'undefined') return false;
        return localStorage.getItem('autoRefreshEnabled') === 'true';
    });

    const [interval, setInterval] = useState<RefreshInterval>(() => {
        if (typeof window === 'undefined') return '30s';
        return (localStorage.getItem('autoRefreshInterval') as RefreshInterval) || intervalPreference;
    });

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
