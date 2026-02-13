export type WebSocketMessage =
    | { type: 'INIT'; data: any }
    | { type: 'SERVICE_UPDATE'; data: { name: string; status: string; code: number; lastUpdated: string } }
    | { type: 'METRICS'; data: any }
    | { type: 'INCIDENT_NEW'; data: any }
    | { type: 'INCIDENT_RESOLVED'; data: { id: string } };

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ||
    (typeof window !== 'undefined' ? `ws://${window.location.hostname}:4000` : 'ws://localhost:4000');
