/**
 * SLO Uptime Tracker
 * 
 * Tracks downtime events per service. In production this would be backed
 * by a database; here we use in-memory storage with demo seed data.
 */

const { v4: uuidv4 } = require('uuid');

// In-memory store: serviceId -> [{ id, serviceId, downtimeMinutes, resolvedAt, createdAt, description }]
const downtimeStore = new Map();

/**
 * Record a downtime event for a service.
 */
function recordDowntime(serviceId, downtimeMinutes, description = '') {
    if (!serviceId || typeof downtimeMinutes !== 'number' || downtimeMinutes <= 0) {
        throw new Error('Invalid downtime parameters: serviceId and positive downtimeMinutes required');
    }

    const event = {
        id: uuidv4(),
        serviceId,
        downtimeMinutes,
        description,
        resolvedAt: Date.now(),
        createdAt: Date.now() - (downtimeMinutes * 60 * 1000),
    };

    if (!downtimeStore.has(serviceId)) {
        downtimeStore.set(serviceId, []);
    }
    downtimeStore.get(serviceId).push(event);

    return event;
}

/**
 * Get all downtime incidents for a service within a time window.
 */
function getIncidents(serviceId, windowStart = 0) {
    const events = downtimeStore.get(serviceId) || [];
    return events.filter(e => e.resolvedAt >= windowStart);
}

/**
 * Get all downtime incidents across all services.
 */
function getAllIncidents() {
    const all = [];
    for (const [, events] of downtimeStore) {
        all.push(...events);
    }
    return all.sort((a, b) => b.resolvedAt - a.resolvedAt);
}

/**
 * Clear all tracked data (useful for testing).
 */
function clearAll() {
    downtimeStore.clear();
}

/**
 * Clear tracked data for a specific service.
 */
function clearService(serviceId) {
    downtimeStore.delete(serviceId);
}

/**
 * Seed demo downtime data for demonstration purposes.
 */
function seedDemoData() {
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;

    // API Gateway — minor blips
    const apiGatewayEvents = [
        { minutes: 2, daysAgo: 12, desc: 'Brief connectivity timeout' },
        { minutes: 0.5, daysAgo: 5, desc: 'Health check flap' },
        { minutes: 1.5, daysAgo: 1, desc: 'Load balancer reconfiguration' },
    ];

    // Auth Service — a couple of incidents
    const authServiceEvents = [
        { minutes: 5, daysAgo: 20, desc: 'Clock drift on auth-node-3' },
        { minutes: 3, daysAgo: 8, desc: 'Token validation spike' },
        { minutes: 1, daysAgo: 2, desc: 'Certificate renewal delay' },
    ];

    // Payment Service — one bigger incident
    const paymentServiceEvents = [
        { minutes: 15, daysAgo: 15, desc: 'Worker thread pool exhaustion' },
        { minutes: 8, daysAgo: 6, desc: 'Database connection pool saturated' },
        { minutes: 3, daysAgo: 1, desc: 'Payment gateway timeout' },
    ];

    // Notification Service — moderate issues
    const notificationServiceEvents = [
        { minutes: 10, daysAgo: 18, desc: 'Email queue backlog overflow' },
        { minutes: 4, daysAgo: 9, desc: 'Push notification provider outage' },
        { minutes: 2, daysAgo: 3, desc: 'SMS rate limit exceeded' },
    ];

    const seedService = (serviceId, events) => {
        events.forEach(({ minutes, daysAgo, desc }) => {
            const resolvedAt = now - (daysAgo * day) + (minutes * 60 * 1000);
            const event = {
                id: uuidv4(),
                serviceId,
                downtimeMinutes: minutes,
                description: desc,
                resolvedAt,
                createdAt: resolvedAt - (minutes * 60 * 1000),
            };
            if (!downtimeStore.has(serviceId)) {
                downtimeStore.set(serviceId, []);
            }
            downtimeStore.get(serviceId).push(event);
        });
    };

    seedService('api-gateway', apiGatewayEvents);
    seedService('auth-service', authServiceEvents);
    seedService('payment-service', paymentServiceEvents);
    seedService('notification-service', notificationServiceEvents);
}

// Auto-seed on load
seedDemoData();

module.exports = {
    recordDowntime,
    getIncidents,
    getAllIncidents,
    clearAll,
    clearService,
    seedDemoData,
};
