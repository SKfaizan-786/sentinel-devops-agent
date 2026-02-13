export interface InitPayload {
    message?: string;
    services?: Record<string, unknown>;
    aiAnalysis?: unknown;
    [key: string]: unknown;
}

export interface MetricsPayload {
    services?: Record<string, unknown>;
    [key: string]: unknown;
}

export interface IncidentNewPayload {
    id?: string;
    summary?: string;
    analysis?: string;
    timestamp?: string;
    [key: string]: unknown;
}

export type WebSocketMessage =
    | { type: 'INIT'; data: InitPayload }
    | { type: 'SERVICE_UPDATE'; data: { name: string; status: string; code: number; lastUpdated: string } }
    | { type: 'METRICS'; data: MetricsPayload }
    | { type: 'INCIDENT_NEW'; data: IncidentNewPayload }
    | { type: 'INCIDENT_RESOLVED'; data: { id: string } };

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ||
    (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:4000`
        : 'ws://localhost:4000');
