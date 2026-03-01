/**
 * Mock SLO Services
 * Provides test data and mock implementations for SLO calculator, tracker, and models
 */

/**
 * Create mock SLO definition
 */
function createMockSLO(overrides = {}) {
  return {
    id: 'slo-' + Math.random().toString(36).substr(2, 9),
    serviceId: 'service-123',
    serviceName: 'Payment API',
    targetAvailability: 99.9,
    trackingWindow: '1month',
    includeScheduledMaintenance: false,
    createdAt: new Date(Date.now() - 2592000000).toISOString(), // 30 days ago
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create mock incident data
 */
function createMockIncident(overrides = {}) {
  return {
    id: 'incident-' + Math.random().toString(36).substr(2, 9),
    serviceId: 'service-123',
    severity: 'high',
    status: 'resolved',
    description: 'Database connection timeout',
    createdAt: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    resolvedAt: new Date(Date.now() - 1800000).toISOString(), // 30 minutes ago
    downtimeMinutes: 30,
    mttrSeconds: 1800,
    ...overrides,
  };
}

/**
 * Mock SLO Model
 */
const MockSLOModel = {
  getAll: jest.fn(() => [
    createMockSLO({ serviceName: 'Auth Service', targetAvailability: 99.95 }),
    createMockSLO({ serviceName: 'Payment API', targetAvailability: 99.9 }),
    createMockSLO({ serviceName: 'Notification Service', targetAvailability: 99.0 }),
  ]),

  getById: jest.fn((id) => {
    return createMockSLO({ id });
  }),

  create: jest.fn((data) => {
    return createMockSLO(data);
  }),

  update: jest.fn((id, data) => {
    return createMockSLO({ id, ...data });
  }),

  delete: jest.fn(async (id) => {
    return { success: true, id };
  }),
};

/**
 * Mock SLO Tracker
 */
const MockSLOTracker = {
  getIncidents: jest.fn((serviceId) => {
    return [
      createMockIncident({ serviceId, downtimeMinutes: 15 }),
      createMockIncident({
        serviceId,
        downtimeMinutes: 25,
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      }),
    ];
  }),

  recordIncident: jest.fn((incident) => {
    return createMockIncident(incident);
  }),

  resolveIncident: jest.fn((incidentId, mttrSeconds) => {
    return createMockIncident({
      id: incidentId,
      status: 'resolved',
      resolvedAt: new Date().toISOString(),
      mttrSeconds,
    });
  }),
};

/**
 * Mock error budget data
 */
function createMockErrorBudget(overrides = {}) {
  return {
    allowedDowntimeMinutes: 43.2,
    totalDowntimeMinutes: 10,
    remainingMinutes: 33.2,
    budgetPercent: 76.85,
    currentAvailability: 99.98,
    status: 'healthy',
    burndownRatePerDay: 5.5,
    projectedExhaustionDate: new Date(Date.now() + 13737600000).toISOString(),
    ...overrides,
  };
}

/**
 * Mock SLO Calculator
 */
const MockSLOCalculator = {
  calculateErrorBudget: jest.fn((sloDefinition, incidents) => {
    return createMockErrorBudget();
  }),

  generateBurndownData: jest.fn((sloDefinition, incidents) => {
    const data = [];
    for (let i = 0; i < 30; i++) {
      data.push({
        date: new Date(Date.now() - i * 86400000).toISOString().split('T')[0],
        budgetRemaining: Math.max(0, 100 - i * 3),
        downtimeAccumulated: i * 3,
      });
    }
    return data;
  }),
};

module.exports = {
  createMockSLO,
  createMockIncident,
  createMockErrorBudget,
  MockSLOModel,
  MockSLOTracker,
  MockSLOCalculator,
};
