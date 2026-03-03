'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ReasoningStep {
  step: number;
  type: 'investigation_started' | 'evidence_collected' | 'hypothesis_formed' | 'hypothesis_tested' | 'action_triggered' | 'action_completed' | 'conclusion_reached';
  description: string;
  confidence: number;
  evidence?: Record<string, any>;
  ts: number;
  incidentId: string;
}

interface UseReasoningStreamReturn {
  steps: ReasoningStep[];
  isLoading: boolean;
  error: string | null;
  currentConfidence: number;
  maxConfidence: number;
  isConnected: boolean;
  reconnect: () => void;
}

/**
 * Hook to stream reasoning steps from the backend via SSE
 * @param incidentId - The incident ID to stream reasoning for
 * @param enabled - Whether to enable the stream (default: true)
 * @returns Object containing steps, loading state, and connection status
 */
export function useReasoningStream(
  incidentId: string | undefined,
  enabled: boolean = true
): UseReasoningStreamReturn {
  const [steps, setSteps] = useState<ReasoningStep[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const getApiUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || `${window.location.protocol}//${window.location.host}`;
    return `${baseUrl}/api/reasoning/stream/${incidentId}`;
  }, [incidentId]);

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (isConnected || !incidentId || !enabled) return;
    
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      setError('Max reconnection attempts reached. Please refresh the page.');
      return;
    }

    reconnectAttemptsRef.current += 1;
    setIsLoading(true);
    
    // Connect with exponential backoff
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
    setTimeout(() => {
      connectToStream();
    }, delay);
  }, [incidentId, enabled, isConnected]);

  const connectToStream = useCallback(() => {
    if (!incidentId || !enabled) return;

    try {
      setIsLoading(true);
      setError(null);

      const eventSource = new EventSource(getApiUrl());

      eventSource.addEventListener('open', () => {
        setIsConnected(true);
        setIsLoading(false);
        reconnectAttemptsRef.current = 0;
        console.log(`Connected to reasoning stream for incident ${incidentId}`);
      });

      eventSource.addEventListener('message', (event) => {
        try {
          const step = JSON.parse(event.data) as ReasoningStep;
          setSteps((prev) => [...prev, step]);
        } catch (e) {
          console.error('Failed to parse reasoning step:', e);
        }
      });

      eventSource.addEventListener('error', () => {
        setIsConnected(false);
        setIsLoading(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          setError('Connection closed by server');
          eventSource.close();
          reconnect();
        }
      });

      eventSourceRef.current = eventSource;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to reasoning stream');
      setIsLoading(false);
      reconnect();
    }
  }, [incidentId, enabled, getApiUrl, reconnect]);

  useEffect(() => {
    if (!incidentId || !enabled) {
      disconnect();
      return;
    }

    connectToStream();

    return () => {
      disconnect();
    };
  }, [incidentId, enabled, connectToStream, disconnect]);

  // Calculate current and max confidence
  const currentConfidence = steps.length > 0 ? steps[steps.length - 1].confidence : 0;
  const maxConfidence = Math.max(...steps.map((s) => s.confidence), 0);

  return {
    steps,
    isLoading,
    error,
    currentConfidence,
    maxConfidence,
    isConnected,
    reconnect,
  };
}
