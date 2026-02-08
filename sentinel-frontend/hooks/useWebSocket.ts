"use client";

import { useEffect, useState, useCallback } from "react";


// Mock types for our simulation
type WebSocketMessage = {
  type: "metrics_update" | "incident_alert" | "log_entry";
  payload: unknown;
};

interface UseWebSocketOptions {
  onMessage?: (message: WebSocketMessage) => void;
  enabled?: boolean;
  simulationInterval?: number;
}

/**
 * useWebSocket Hook
 * 
 * Simulates a real WebSocket connection for the hackathon.
 * In a real app, this would connect to the backend WebSocket server.
 */
export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const { onMessage, enabled = true, simulationInterval = 2000 } = options;
  const [internalStatus, setInternalStatus] = useState<"connecting" | "connected" | "disconnected">("disconnected");
  // const themeStatus = statusMap[incident.status] || "unknown";nected";
  const status = enabled ? internalStatus : "disconnected";
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  // Simulation Logic
  const simulateMessage = useCallback(() => {
    // 1. Metrics Update Simulation
    // Randomize response times and error rates slightly to create "movement"
    const metricsPayload = {
      timestamp: new Date().toISOString(),
      services: {
        "api-gateway": { responseTime: 45 + Math.random() * 20, errorRate: Math.random() * 0.5, cpu: 30 + Math.random() * 10 },
        "auth-service": { responseTime: 80 + Math.random() * 30, errorRate: Math.random() * 0.2, cpu: 20 + Math.random() * 5 },
        "primary-db": { responseTime: 120 + Math.random() * 40, errorRate: Math.random() * 0.1, cpu: 45 + Math.random() * 15 },
        "payments-worker": { responseTime: 200 + Math.random() * 50, errorRate: Math.random() * 0.3, cpu: 15 + Math.random() * 5 },
      }
    };

    const message: WebSocketMessage = {
      type: "metrics_update",
      payload: metricsPayload,
    };

    setLastMessage(message);
    if (onMessage) {
      onMessage(message);
    }
  }, [onMessage]);

  useEffect(() => {
    // 1. Handle disabled state
    // 1. Handle disabled state - Reset internal status if needed when re-enabled
    if (!enabled) {
      // No need to setStatus here as it is derived
      return;
    }

    // 2. Handle connection flow state machine
    if (internalStatus === "disconnected") {
      setTimeout(() => setInternalStatus("connecting"), 0);
    } else if (internalStatus === "connecting") {
      // Simulate connection delay
      const timer = setTimeout(() => {
        setInternalStatus("connected");
      }, 500);
      return () => clearTimeout(timer);
    } else if (internalStatus === "connected") {
      // Start simulation loop
      const interval = setInterval(simulateMessage, simulationInterval);

      // Store reference to clear on unmount/cleanup if needed, 
      // but returning the cleanup function is sufficient here.
      return () => clearInterval(interval);
    }
  }, [enabled, internalStatus, simulationInterval, simulateMessage]);

  return { status, lastMessage };
}
