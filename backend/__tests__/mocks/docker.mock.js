/**
 * Mock Docker Service
 * Provides mock implementations of Docker client operations for testing
 */

/**
 * Mock Docker container data
 */
function createMockContainer(overrides = {}) {
  return {
    Id: 'abc123def456' + Math.random().toString(36).substr(2, 9),
    Names: ['/test-container-999'],
    Image: 'test-image:latest',
    State: 'running',
    Status: 'Up 2 hours (healthy)',
    Ports: [],
    Created: Math.floor(Date.now() / 1000) - 7200,
    Labels: {
      'sentinel.monitor': 'true',
    },
    ...overrides,
  };
}

/**
 * Mock health status data
 */
function createMockHealthStatus(status = 'healthy', overrides = {}) {
  return {
    status,
    failingStreak: 0,
    log: [
      {
        Start: new Date(Date.now() - 60000).toISOString(),
        End: new Date().toISOString(),
        ExitCode: 0,
        Output: 'Health check passed',
      },
    ],
    ...overrides,
  };
}

/**
 * Mock Dockerode client
 */
const MockDockerClient = {
  docker: {
    listContainers: jest.fn(async (options) => {
      return [
        createMockContainer({ Names: ['/web-app'], Image: 'nginx:latest' }),
        createMockContainer({ Names: ['/api-server'], Image: 'node:18' }),
        createMockContainer({ Names: ['/database'], Image: 'postgres:15', State: 'exited' }),
      ];
    }),

    getContainer: jest.fn((id) => ({
      inspect: jest.fn(async () => ({
        Id: id,
        State: {
          Health: {
            Status: 'healthy',
            FailingStreak: 0,
            Log: [],
          },
        },
      })),
      kill: jest.fn(async () => {}),
      stop: jest.fn(async () => {}),
      restart: jest.fn(async () => {}),
    })),
  },

  listContainers: jest.fn(async (filters) => {
    return [
      createMockContainer({ Names: ['/web-app'], Image: 'nginx:latest' }),
      createMockContainer({ Names: ['/api-server'], Image: 'node:18' }),
    ];
  }),

  getContainerHealth: jest.fn(async (containerId) => {
    return createMockHealthStatus('healthy');
  }),
};

/**
 * Mock Docker scanner
 */
const MockDockerScanner = {
  scanImage: jest.fn(async (imageId) => {
    return {
      imageId,
      scannedAt: new Date().toISOString(),
      vulnerabilities: [],
      severity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      status: 'passed',
    };
  }),

  startScanner: jest.fn(async () => {
    return { status: 'started' };
  }),

  clearCache: jest.fn(() => {
    return { status: 'cleared' };
  }),
};

/**
 * Mock Docker healer
 */
const MockDockerHealer = {
  healContainer: jest.fn(async (containerId, healingAction) => {
    return {
      containerId,
      action: healingAction,
      timestamp: new Date().toISOString(),
      status: 'success',
    };
  }),

  getHealingHistory: jest.fn(async () => {
    return [];
  }),
};

module.exports = {
  createMockContainer,
  createMockHealthStatus,
  MockDockerClient,
  MockDockerScanner,
  MockDockerHealer,
};
