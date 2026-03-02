/**
 * SLO Definition Model
 * 
 * In-memory store for SLO definitions with CRUD operations
 * and schema validation.
 */

const { v4: uuidv4 } = require('uuid');

// Valid values
const VALID_WINDOWS = ['1day', '7days', '1month'];

// In-memory SLO store
const sloStore = new Map();

/**
 * Validate an SLO definition object.
 */
function validate(data) {
    const errors = [];

    if (!data.serviceId || typeof data.serviceId !== 'string') {
        errors.push('serviceId is required and must be a string');
    }

    if (data.targetAvailability === undefined || typeof data.targetAvailability !== 'number') {
        errors.push('targetAvailability is required and must be a number');
    } else if (data.targetAvailability < 90 || data.targetAvailability > 99.999) {
        errors.push('targetAvailability must be between 90 and 99.999');
    }

    if (!data.trackingWindow || !VALID_WINDOWS.includes(data.trackingWindow)) {
        errors.push(`trackingWindow must be one of: ${VALID_WINDOWS.join(', ')}`);
    }

    if (data.alertThreshold !== undefined) {
        if (typeof data.alertThreshold !== 'number' || data.alertThreshold < 0 || data.alertThreshold > 1) {
            errors.push('alertThreshold must be a number between 0 and 1');
        }
    }

    return errors;
}

/**
 * Create a new SLO definition.
 */
function create(data) {
    const errors = validate(data);
    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join('; ')}`);
    }

    const slo = {
        id: uuidv4(),
        serviceId: data.serviceId,
        serviceName: data.serviceName || data.serviceId,
        targetAvailability: data.targetAvailability,
        trackingWindow: data.trackingWindow,
        includeScheduledMaintenance: data.includeScheduledMaintenance || false,
        alertThreshold: data.alertThreshold || 0.25,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };

    sloStore.set(slo.id, slo);
    return slo;
}

/**
 * Get an SLO by ID.
 */
function getById(id) {
    return sloStore.get(id) || null;
}

/**
 * Get all SLO definitions.
 */
function getAll() {
    return Array.from(sloStore.values());
}

/**
 * Get SLO by service ID.
 */
function getByServiceId(serviceId) {
    return getAll().find(slo => slo.serviceId === serviceId) || null;
}

/**
 * Update an SLO definition.
 */
function update(id, data) {
    const existing = sloStore.get(id);
    if (!existing) {
        return null;
    }

    const merged = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
    const errors = validate(merged);
    if (errors.length > 0) {
        throw new Error(`Validation failed: ${errors.join('; ')}`);
    }

    sloStore.set(id, merged);
    return merged;
}

/**
 * Delete an SLO definition.
 */
function remove(id) {
    return sloStore.delete(id);
}

/**
 * Seed demo SLO definitions.
 */
function seedDemoData() {
    const demoSLOs = [
        {
            serviceId: 'api-gateway',
            serviceName: 'API Gateway',
            targetAvailability: 99.95,
            trackingWindow: '1month',
            alertThreshold: 0.25,
        },
        {
            serviceId: 'auth-service',
            serviceName: 'Auth Service',
            targetAvailability: 99.9,
            trackingWindow: '1month',
            alertThreshold: 0.25,
        },
        {
            serviceId: 'payment-service',
            serviceName: 'Payment Service',
            targetAvailability: 99.9,
            trackingWindow: '1month',
            alertThreshold: 0.25,
        },
        {
            serviceId: 'notification-service',
            serviceName: 'Notification Service',
            targetAvailability: 99.5,
            trackingWindow: '7days',
            alertThreshold: 0.25,
        },
    ];

    demoSLOs.forEach(slo => create(slo));
}

// Auto-seed
seedDemoData();

module.exports = {
    create,
    getById,
    getAll,
    getByServiceId,
    update,
    remove,
    validate,
    VALID_WINDOWS,
    VALID_TARGETS,
};
