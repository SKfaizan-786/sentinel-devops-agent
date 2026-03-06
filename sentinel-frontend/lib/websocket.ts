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

<<<<<<< HEAD
=======
import { Prediction } from '@/components/dashboard/PredictionBadge';

export interface ActivityLogPayload {
    id: number;
    timestamp: string;
    type: string;
    message: string;
}

export interface ContainerUpdatePayload {
    containers: Array<{
        id: string;
        displayId: string;
        name: string;
        image: string;
        status: string;
        health: 'healthy' | 'unhealthy' | 'unknown';
        ports: { PrivatePort: number; PublicPort?: number; Type: string }[];
        created: string;
        [key: string]: unknown;
    }>;
}

>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963
export type WebSocketMessage =
    | { type: 'INIT'; data: InitPayload }
    | { type: 'SERVICE_UPDATE'; data: { name: string; status: string; code: number; lastUpdated: string } }
    | { type: 'METRICS'; data: MetricsPayload }
    | { type: 'INCIDENT_NEW'; data: IncidentNewPayload }
<<<<<<< HEAD
    | { type: 'INCIDENT_RESOLVED'; data: { id: string } };
=======
    | { type: 'INCIDENT_RESOLVED'; data: { id: string } }
    | { type: 'SCALE_PREDICTION'; data: { predictions: unknown[]; evaluatedAt: string } }
    | { type: 'PREDICTION'; data: Prediction }
    | { type: 'ACTIVITY_LOG'; data: ActivityLogPayload }
    | { type: 'CONTAINER_UPDATE'; data: ContainerUpdatePayload };
>>>>>>> 0bbacf9800842bb21b1c317f29ea73097dcdc963

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL ||
    (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.hostname}:4000`
        : 'ws://localhost:4000');
