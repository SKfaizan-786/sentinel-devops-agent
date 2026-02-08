import { useState, useEffect } from 'react';
import axios from 'axios';

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

export function useContainers() {
    const [containers, setContainers] = useState<Container[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContainers = async () => {
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
    };

    const restartContainer = async (id: string) => {
        try {
            await axios.post(`${API_BASE}/api/docker/restart/${id}`);
            // Await refresh to ensure UI is up to date vs swallowing error
            await fetchContainers();
        } catch (err: unknown) {
            console.error("Failed to restart container:", err);
            // Propagate error to UI if needed, or set local error state
            const message = err instanceof Error ? err.message : "Failed to restart container";
            setError(message);
            throw err;
        }
    };

    useEffect(() => {
        fetchContainers();
        const interval = setInterval(fetchContainers, 5000);
        return () => clearInterval(interval);
    }, []);

    return {
        containers,
        loading,
        error,
        restartContainer,
        refetch: fetchContainers
    };
}
