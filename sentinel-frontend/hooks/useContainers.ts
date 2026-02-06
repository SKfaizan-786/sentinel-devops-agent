import { useState, useEffect } from 'react';
import axios from 'axios';

// Using a relative URL assuming proxy setup or direct backend URL
// Since it's Next.js, we might need env var. For now hardcoding or using expectation of proxy.
// User prompt implementation guide didn't specify frontend networking details.
// I'll assume standard axios usage.

export interface Container {
    id: string;
    name: string;
    image: string;
    status: string;
    health: 'healthy' | 'unhealthy' | 'unknown';
    ports: any[];
    created: string;
}

export function useContainers() {
    const [containers, setContainers] = useState<Container[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchContainers = async () => {
        try {
            // Assuming backend is on port 4000, and we might be on 3000. 
            // Need CORS or proxy. Backend has CORS enabled.
            const response = await axios.get('http://localhost:4000/api/docker/containers');
            setContainers(response.data.containers);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch containers');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchContainers();
        const interval = setInterval(fetchContainers, 5000); // Poll every 5 seconds
        return () => clearInterval(interval);
    }, []);

    const restartContainer = async (id: string) => {
        try {
            await axios.post(`http://localhost:4000/api/docker/restart/${id}`);
            fetchContainers(); // Refresh immediately
        } catch (err: any) {
            console.error('Failed to restart container:', err);
            // Optional: expose error state for actions
        }
    };

    return { containers, loading, error, restartContainer, refetch: fetchContainers };
}
