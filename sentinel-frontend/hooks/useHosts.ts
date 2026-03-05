import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export interface HostHealth {
    id: string;
    label: string;
    type: 'local' | 'remote' | 'tcp' | 'ssh';
    status: 'connected' | 'disconnected';
    error?: string;
    swarmActive?: boolean;
    swarmInfo?: {
        nodeId: string;
        nodeAddr: string;
        isManager: boolean;
        nodes: number;
        managers: number;
        cluster: string | null;
    } | null;
    dockerVersion?: string;
    containers?: number;
    containersRunning?: number;
    containersPaused?: number;
    containersStopped?: number;
    images?: number;
    memoryTotal?: number;
    cpuCount?: number;
    lastChecked?: string;
}

export interface HostsData {
    total: number;
    connected: number;
    hosts: HostHealth[];
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface UseHostsOptions {
    manual?: boolean;
    pollInterval?: number; // Auto-refresh interval in ms
}

export function useHosts(options: UseHostsOptions = {}) {
    const { manual, pollInterval } = options;
    const [hosts, setHosts] = useState<HostHealth[]>([]);
    const [loading, setLoading] = useState(!manual);
    const [error, setError] = useState<string | null>(null);
    const [totalHosts, setTotalHosts] = useState(0);
    const [connectedHosts, setConnectedHosts] = useState(0);

    const fetchHosts = useCallback(async () => {
        try {
            const response = await axios.get<HostsData>(`${API_BASE}/api/hosts`);
            setHosts(response.data.hosts || []);
            setTotalHosts(response.data.total || 0);
            setConnectedHosts(response.data.connected || 0);
            setError(null);
        } catch (err: unknown) {
            console.error("Failed to fetch hosts:", err);
            const message = err instanceof Error ? err.message : "Failed to load hosts";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const refreshHosts = useCallback(async () => {
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/api/hosts/refresh`);
            await fetchHosts();
        } catch (err: unknown) {
            console.error("Failed to refresh hosts:", err);
            const message = err instanceof Error ? err.message : "Failed to refresh hosts";
            setError(message);
            setLoading(false);
        }
    }, [fetchHosts]);

    // Auto-fetch on mount only when not in manual mode
    useEffect(() => {
        if (!manual) {
            fetchHosts();
        }
    }, [manual, fetchHosts]);

    // Optional polling for auto-refresh
    useEffect(() => {
        if (pollInterval && pollInterval > 0) {
            const interval = setInterval(fetchHosts, pollInterval);
            return () => clearInterval(interval);
        }
    }, [pollInterval, fetchHosts]);

    // Get Swarm hosts only
    const swarmHosts = hosts.filter(h => h.swarmActive);

    // Check if any host has Swarm mode active
    const hasSwarmMode = swarmHosts.length > 0;

    return {
        hosts,
        loading,
        error,
        totalHosts,
        connectedHosts,
        swarmHosts,
        hasSwarmMode,
        refetch: fetchHosts,
        refresh: refreshHosts
    };
}
