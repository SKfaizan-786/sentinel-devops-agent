"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { WebSocketMessage } from './websocket';

interface WebSocketConnectionContextType {
    isConnected: boolean;
    sendMessage: (msg: unknown) => void;
}

const WebSocketConnectionContext = createContext<WebSocketConnectionContextType | undefined>(undefined);
const WebSocketMessageContext = createContext<WebSocketMessage | null>(null);

export function WebSocketProvider({ children }: { children: ReactNode }) {
    const { isConnected, lastMessage, sendMessage } = useWebSocket();

    const connectionValue = React.useMemo(() => ({
        isConnected,
        sendMessage
    }), [isConnected, sendMessage]);

    return (
        <WebSocketConnectionContext.Provider value={connectionValue}>
            <WebSocketMessageContext.Provider value={lastMessage}>
                {children}
            </WebSocketMessageContext.Provider>
        </WebSocketConnectionContext.Provider>
    );
}

export function useWebSocketConnection() {
    const context = useContext(WebSocketConnectionContext);
    if (context === undefined) {
        throw new Error('useWebSocketConnection must be used within a WebSocketProvider');
    }
    return context;
}

export function useWebSocketMessage() {
    return useContext(WebSocketMessageContext);
}
