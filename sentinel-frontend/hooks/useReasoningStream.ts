'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ReasoningStep {
  step: number;
  type: 'investigation_started' | 'evidence_collected' | 'hypothesis_formed' | 'hypothesis_tested' | 'action_triggered' | 'action_completed' | 'conclusion_reached';
  description: string;
  confidence: number;
  evidence?: Record<string, unknown>;
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const getApiUrl = useCallback(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 
      (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}` : '');
    return `${baseUrl}/api/reasoning/stream/${incidentId}`;
  }, [incidentId]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const connectToStreamInternal = useCallback(() => {
    if (!incidentId || !enabled) return;

    // Clean up existing connection before starting a new one
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      setIsLoading(true);
      setError(null);

      const eventSource = new EventSource(getApiUrl());

      eventSource.onopen = () => {
        setIsConnected(true);
        setIsLoading(false);
        reconnectAttemptsRef.current = 0;
        console.log(`Connected to reasoning stream for incident ${incidentId}`);
      };

      eventSource.onmessage = (event) => {
        try {
          const step = JSON.parse(event.data) as ReasoningStep;
          setSteps((prev) => {
            // Check if step already exists to prevent duplicates on reconnect
            if (prev.some(s => s.step === step.step && s.ts === step.ts)) return prev;
            return [...prev, step];
          });
        } catch (e) {
          console.error('Failed to parse reasoning step:', e);
        }
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        setIsLoading(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          eventSource.close();
          
          if (reconnectAttemptsRef.current < maxReconnectAttempts) {
            reconnectAttemptsRef.current += 1;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 10000);
            
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => {
              connectToStreamInternal();
            }, delay);
          } else {
            setError('Max reconnection attempts reached. Please refresh the page.');
          }
        }
      };

      eventSourceRef.current = eventSource;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect to reasoning stream');
      setIsLoading(false);
    }
  }, [incidentId, enabled, getApiUrl]);

  const connectToStream = useRef(connectToStreamInternal);
  connectToStream.current = connectToStreamInternal;

  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    connectToStream.current();
  }, []);

  useEffect(() => {
    if (incidentId && enabled) {
      connectToStream.current();
    }

    return () => {
      disconnect();
    };
  }, [incidentId, enabled, disconnect]);

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
