import { Activity, Server, Database, Cloud, Shield, AlertTriangle, CheckCircle, XCircle } from "lucide-react";

export interface Service {
    id: string;
    name: string;
    type: "api" | "database" | "worker" | "cache";
    status: "healthy" | "degraded" | "down";
    uptime: number;
    latency: number;
    cpu: number;
    memory: number;
    trend: number[]; // 1-hour trend for sparkline
}

export interface Incident {
    id: string;
    title: string;
    serviceId: string;
    status: "resolved" | "in-progress" | "failed";
    severity: "critical" | "warning" | "info";
    timestamp: string;
    duration: string;
}

export const mockServices: Service[] = [
    {
        id: "api-gateway",
        name: "API Gateway",
        type: "api",
        status: "healthy",
        uptime: 99.99,
        latency: 45,
        cpu: 32,
        memory: 45,
        trend: [40, 42, 45, 48, 45, 42, 40, 38, 42, 45, 45, 42],
    },
    {
        id: "auth-service",
        name: "Auth Service",
        type: "api",
        status: "healthy",
        uptime: 99.95,
        latency: 28,
        cpu: 15,
        memory: 30,
        trend: [25, 28, 30, 28, 25, 22, 25, 28, 30, 28, 28, 25],
    },
    {
        id: "payments-worker",
        name: "Payments Worker",
        type: "worker",
        status: "degraded",
        uptime: 98.5,
        latency: 120,
        cpu: 85,
        memory: 70,
        trend: [60, 70, 80, 90, 100, 120, 110, 115, 120, 125, 120, 118],
    },
    {
        id: "primary-db",
        name: "Primary DB (Postgres)",
        type: "database",
        status: "healthy",
        uptime: 99.99,
        latency: 12,
        cpu: 45,
        memory: 60,
        trend: [10, 12, 15, 12, 10, 12, 15, 18, 15, 12, 12, 10],
    },
    {
        id: "redis-cache",
        name: "Redis Cache",
        type: "cache",
        status: "healthy",
        uptime: 100,
        latency: 2,
        cpu: 10,
        memory: 25,
        trend: [2, 3, 2, 2, 3, 2, 2, 2, 3, 2, 2, 2],
    },
    {
        id: "search-service",
        name: "Search Service",
        type: "api",
        status: "down",
        uptime: 95.2,
        latency: 0,
        cpu: 0,
        memory: 0,
        trend: [40, 50, 60, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    },
];

export const mockIncidents: Incident[] = [
    {
        id: "inc-1",
        title: "High Latency in Payments",
        serviceId: "payments-worker",
        status: "in-progress",
        severity: "warning",
        timestamp: "2 mins ago",
        duration: "Ongoing",
    },
    {
        id: "inc-2",
        title: "Search Service Outage",
        serviceId: "search-service",
        status: "failed",
        severity: "critical",
        timestamp: "15 mins ago",
        duration: "15m",
    },
    {
        id: "inc-3",
        title: "Auth Token Expiry Spike",
        serviceId: "auth-service",
        status: "resolved",
        severity: "info",
        timestamp: "2 hours ago",
        duration: "5m 20s",
    },
];

export const mockMetrics = {
    totalServices: 12,
    servicesUp: 10,
    activeIncidents: 2,
    uptime: 99.4,
};
