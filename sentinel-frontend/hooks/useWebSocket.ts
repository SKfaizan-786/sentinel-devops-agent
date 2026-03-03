"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { WS_URL, WebSocketMessage } from '../lib/websocket';

interface UseWebSocketOptions {
  onMessage?: (data: WebSocketMessage) => void;
  reconnectInterval?: number;
  enabled?: boolean;
}

export function useWebSocket({ onMessage, reconnectInterval = 3000, enabled = true }: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | number | undefined>(undefined);
  const isMountedRef = useRef(true);

  // Keep onMessage stable
  const onMessageRef = useRef(onMessage);
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  // Ref to hold connect function for recursion/timeouts
  const connectRef = useRef<(() => void) | null>(null);

  const connect = useCallback(() => {
    if (!enabled) return;

    // Clear any pending reconnects
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = undefined;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      if (!isMountedRef.current) {
        ws.close();
        return;
      }
      setIsConnected(true);
      console.log('🔌 WebSocket connected');
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        setLastMessage(data);
        onMessageRef.current?.(data);
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);

      // Only reconnect if this is still the active socket
      if (wsRef.current === ws) {
        reconnectTimeoutRef.current = setTimeout(() => {
          if (isMountedRef.current) {
            console.log('🔄 Reconnecting WebSocket...');
            connectRef.current?.();
          }
        }, reconnectInterval);
      }
    };

    ws.onerror = (error) => {
      if (!isMountedRef.current) return;
      console.error("WebSocket error:", error);
      // ws.close() will be called, triggering onclose
    };

    wsRef.current = ws;
  }, [reconnectInterval, enabled]);

  // Update ref whenever connect changes
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    isMountedRef.current = true;
    connect();
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const sendMessage = useCallback((msg: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  return { isConnected, lastMessage, sendMessage };
}

