import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useWebSocketMessage, useWebSocketConnection } from '@/lib/WebSocketContext';

export interface ContainerMetrics {
    cpu?: string;
    memory?: {
        usage?: string;
        limit?: string;
        percent?: string;
    };
    network?: {
        rx?: string;
        tx?: string;
    };
    timestamp?: string;
    raw?: {
        cpuPercent?: number;
        memPercent?: number;
        memLimit?: number;
    };
    hostId?: string;
}

export interface Container {
    id: string;
    containerId?: string;
    displayId: string;
    name: string;
    image: string;
    status: string;
    health: 'healthy' | 'unhealthy' | 'unknown';
    ports: { PrivatePort: number; PublicPort?: number; Type: string }[];
    created: string;
    hostId?: string;
    hostLabel?: string;
    metrics?: ContainerMetrics;
    restartCount?: number;
    lastRestart?: number;
}

export interface HostSummary {
    id: string;
    label: string;
    status: 'connected' | 'disconnected';
    containersRunning: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

interface UseContainersOptions {
    manual?: boolean;
    hostId?: string | null;
}

export function useContainers(options: UseContainersOptions = {}) {
    const { manual, hostId } = options;
    const [containers, setContainers] = useState<Container[]>([]);
    const [hosts, setHosts] = useState<HostSummary[]>([]);
    const [loading, setLoading] = useState(!manual);
    const [error, setError] = useState<string | null>(null);
    const lastMessage = useWebSocketMessage();
    const { sendMessage } = useWebSocketConnection();

    const fetchContainers = useCallback(async (filterHostId?: string | null) => {
        setLoading(true);
        try {
            const params = filterHostId ? { hostId: filterHostId } : {};
            const response = await axios.get(`${API_BASE}/api/docker/containers`, { params });
            setContainers(response.data.containers || []);
            if (response.data.hosts) {
                setHosts(response.data.hosts);
            }
            setError(null);
        } catch (err: unknown) {
            console.error("Failed to fetch containers:", err);
            const message = err instanceof Error ? err.message : "Failed to load containers";
            setError(message);
        } finally {
            setLoading(false);
        }
    }, []);

    const restartContainer = async (id: string) => {
        try {
            // The id should be the compound ID (hostId:containerId)
            // URL encode it to handle the colon
            await axios.post(`${API_BASE}/api/docker/restart/${encodeURIComponent(id)}`);
            // The backend will broadcast CONTAINER_UPDATE via WebSocket after restart,
            // so we don't need to manually refetch here.
        } catch (err: unknown) {
            console.error("Failed to restart container:", err);
            const message = err instanceof Error ? err.message : "Failed to restart container";
            setError(message);
            throw err;
        }
    };

    // Auto-fetch on mount only when not in manual mode
    useEffect(() => {
        if (!manual) {
            void fetchContainers(hostId);
        }
        // fetchContainers is stable (empty deps) so this won't cause loops
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [manual, hostId]);

    // React to WebSocket CONTAINER_UPDATE messages for real-time updates
    useEffect(() => {
        if (!lastMessage || lastMessage.type !== 'CONTAINER_UPDATE') return;
        const data = lastMessage.data;
        if (data.containers && Array.isArray(data.containers)) {
            // If filtering by host, only update matching containers
            if (hostId) {
                const filtered = (data.containers as Container[]).filter(c => c.hostId === hostId);
                setContainers(filtered);
            } else {
                setContainers(data.containers as Container[]);
            }
            setLoading(false);
        }
    }, [lastMessage, hostId]);

    // Helper to refetch with current host filter
    const refetch = useCallback(() => {
        return fetchContainers(hostId);
    }, [fetchContainers, hostId]);

    return {
        containers,
        hosts,
        loading,
        error,
        restartContainer,
        refetch,
        fetchContainers
    };
}
