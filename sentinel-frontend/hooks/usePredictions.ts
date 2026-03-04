import { useState, useEffect } from 'react';
import { useWebSocketContext } from '@/lib/WebSocketContext';
import { Prediction } from '@/components/dashboard/PredictionBadge';

function isPrediction(data: unknown): data is Prediction {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof (data as Prediction).containerId === 'string' &&
        typeof (data as Prediction).probability === 'number' &&
        typeof (data as Prediction).reason === 'string'
    );
}

export function usePredictions() {
    const { lastMessage } = useWebSocketContext();
    const [predictions, setPredictions] = useState<Record<string, Prediction>>({});

    useEffect(() => {
        if (!lastMessage) return;
        
        if (lastMessage.type === 'PREDICTION' && isPrediction(lastMessage.data)) {
            const data = lastMessage.data;
            setPredictions(prev => ({
                ...prev,
                [data.containerId]: data
            }));
        }
    }, [lastMessage]);

    return predictions;
}
