import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useWebSocketContext } from '@/lib/WebSocketContext';

export interface Container {
    id: string;
    displayId: string;
    name: string;
    image: string;
    status: string;
    health: 'healthy' | 'unhealthy' | 'unknown';
    ports: { PrivatePort: number; PublicPort?: number; Type: string }[];
    created: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useContainers(options: { manual?: boolean } = {}) {
    const { manual } = options;
    const [containers, setContainers] = useState<Container[]>([]);
    const [loading, setLoading] = useState(!manual);
    const [error, setError] = useState<string | null>(null);
    const { lastMessage } = useWebSocketContext();

    const fetchContainers = useCallback(async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${API_BASE}/api/docker/containers`);
            setContainers(response.data.containers);
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
            await axios.post(`${API_BASE}/api/docker/restart/${id}`);
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
            fetchContainers();
        }
    }, [manual, fetchContainers]);

    // React to WebSocket CONTAINER_UPDATE messages for real-time updates
    useEffect(() => {
        if (!lastMessage || lastMessage.type !== 'CONTAINER_UPDATE') return;
        const data = lastMessage.data;
        if (data.containers && Array.isArray(data.containers)) {
            setContainers(data.containers as Container[]);
            setLoading(false);
        }
    }, [lastMessage]);

    return {
        containers,
        loading,
        error,
        restartContainer,
        refetch: fetchContainers
    };
}
