"use client";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useWebSocketMessage, useWebSocketConnection } from "@/lib/WebSocketContext";

export type Prediction = {
    containerId: string;
    containerName: string;
    failureProbability: number;
    probability: number; // Required for compatibility
    trend: 'rising' | 'stable' | 'falling';
    reasons: string[];
    reason: string; // Required for compatibility
    aiReasoning: string | null;
    recommendation: 'scale-out' | 'monitor';
    metrics: {
        cpuAvg: number;
        memAvg: number;
        cpuTrend: string;
        memTrend: string;
        cpuVelocity: number;
        memVelocity: number;
        samples: number;
    };
    evaluatedAt: string;
    estimatedFailureInSeconds: number | null; // Required for compatibility
    confidence: 'low' | 'medium' | 'high'; // Required for compatibility
    timestamp: number; // Required for compatibility
    // Upstream fields for compatibility
    history?: Array<{ timestamp: string; value: number }>;
    slope?: number;
};

export function usePredictions() {
    const [predictionsArray, setPredictionsArray] = useState<Prediction[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastEvaluated, setLastEvaluated] = useState<string | null>(null);

    const enrichPredictions = useCallback((preds: any[]) => {
        return preds.map(p => ({
            ...p,
            probability: p.failureProbability ?? p.probability ?? 0,
            failureProbability: p.failureProbability ?? p.probability ?? 0,
            reason: p.reason || p.reasons?.[0] || 'Monitoring...',
            confidence: p.confidence || (p.metrics?.samples >= 15 ? 'high' : p.metrics?.samples >= 8 ? 'medium' : 'low'),
            timestamp: p.timestamp || Date.now(),
            estimatedFailureInSeconds: p.estimatedFailureInSeconds ??
                ((p.failureProbability || p.probability) > 0 ? Math.max(30, Math.floor(300 * (1 - (p.failureProbability || p.probability)))) : null)
        }));
    }, []);

    const fetchPredictions = useCallback(async () => {
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
            const res = await fetch(`${apiUrl}/predictions`);
            if (!res.ok) {
                console.error(`Predictions API error: ${res.status} ${res.statusText}`);
                return;
            }
            const data = await res.json();
            if (data.predictions && Array.isArray(data.predictions)) {
                setPredictionsArray(enrichPredictions(data.predictions));
                setLastEvaluated(data.evaluatedAt);
            }
        } catch (e) {
            console.error("Failed to fetch predictions:", e);
        } finally {
            setLoading(false);
        }
    }, [enrichPredictions]);

    // Initial fetch
    useEffect(() => {
        fetchPredictions();
    }, [fetchPredictions]);

    // Listen for WebSocket updates
    const lastMessage = useWebSocketMessage();

    useEffect(() => {
        if (!lastMessage) return;


        if (lastMessage.type === 'SCALE_PREDICTION') {
            const data = lastMessage.data as {
                predictions: Prediction[];
                evaluatedAt: string;
            };
            if (data.predictions && Array.isArray(data.predictions)) {
                setPredictionsArray(enrichPredictions(data.predictions));
                setLastEvaluated(data.evaluatedAt);
            }
        } else if (lastMessage.type === 'PREDICTION') {
            // Handle upstream PREDICTION event (single prediction)
            const upPred = lastMessage.data as any;
            if (upPred && upPred.containerId) {
                setPredictionsArray(prev => {
                    const exists = prev.find(p => p.containerId === upPred.containerId);
                    const newPredArray = enrichPredictions([upPred]);
                    const newPred = {
                        ...exists,
                        ...newPredArray[0],
                        // Maintain original fields that might have been lost
                        containerId: upPred.containerId,
                        containerName: upPred.containerName || exists?.containerName || upPred.containerId.substring(0, 8),
                        recommendation: upPred.recommendation || ((upPred.failureProbability || upPred.probability) > 0.75 ? 'scale-out' : 'monitor'),
                        metrics: exists?.metrics || {
                            cpuAvg: 0,
                            memAvg: 0,
                            cpuTrend: 'stable',
                            memTrend: 'stable',
                            cpuVelocity: 0,
                            memVelocity: 0,
                            samples: 0
                        },
                        aiReasoning: exists?.aiReasoning || null,
                        evaluatedAt: new Date().toISOString()
                    };

                    if (exists) {
                        return prev.map(p => p.containerId === upPred.containerId ? newPred : p);
                    } else {
                        return [...prev, newPred];
                    }
                });
                setLastEvaluated(new Date().toISOString());
            }
        }
    }, [lastMessage, enrichPredictions]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(fetchPredictions, 30000);
        return () => clearInterval(interval);
    }, [fetchPredictions]);

    const predictionsMap = useMemo(() => {
        const map: Record<string, Prediction> = {};
        predictionsArray.forEach(p => {
            map[p.containerId] = p;
        });
        return map;
    }, [predictionsArray]);

    return {
        predictions: predictionsArray,
        predictionsMap,
        loading,
        lastEvaluated
    };
}
