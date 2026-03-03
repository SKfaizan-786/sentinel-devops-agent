/**
 * Mock Kubernetes Services
 * Provides mock implementations of Kubernetes client operations
 */

/**
 * Create mock Kubernetes namespace
 */
function createMockNamespace(name = 'default') {
  return {
    apiVersion: 'v1',
    kind: 'Namespace',
    metadata: {
      name,
      uid: 'uid-' + Math.random().toString(36).substr(2, 9),
      resourceVersion: '12345',
      creationTimestamp: new Date().toISOString(),
    },
    status: {
      phase: 'Active',
    },
  };
}

/**
 * Create mock Kubernetes pod
 */
function createMockPod(name = 'test-pod', namespace = 'default', overrides = {}) {
  return {
    apiVersion: 'v1',
    kind: 'Pod',
    metadata: {
      name,
      namespace,
      uid: 'uid-' + Math.random().toString(36).substr(2, 9),
      creationTimestamp: new Date().toISOString(),
      labels: {
        app: 'test-app',
        version: 'v1',
      },
    },
    spec: {
      containers: [
        {
          name: 'container-1',
          image: 'nginx:latest',
          ports: [{ containerPort: 80 }],
        },
      ],
    },
    status: {
      phase: 'Running',
      containerStatuses: [
        {
          name: 'container-1',
          ready: true,
          restartCount: 0,
          state: {
            running: {
              startedAt: new Date().toISOString(),
            },
          },
        },
      ],
    },
    ...overrides,
  };
}

/**
 * Create mock Kubernetes deployment
 */
function createMockDeployment(name = 'test-deployment', namespace = 'default') {
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace,
      uid: 'uid-' + Math.random().toString(36).substr(2, 9),
    },
    spec: {
      replicas: 3,
      selector: {
        matchLabels: {
          app: name,
        },
      },
    },
    status: {
      replicas: 3,
      updatedReplicas: 3,
      readyReplicas: 3,
      availableReplicas: 3,
      conditions: [
        {
          type: 'Available',
          status: 'True',
        },
      ],
    },
  };
}

/**
 * Create mock Kubernetes event
 */
function createMockEvent(name = 'test-event', namespace = 'default') {
  return {
    apiVersion: 'v1',
    kind: 'Event',
    metadata: {
      name,
      namespace,
    },
    involvedObject: {
      kind: 'Pod',
      name: 'test-pod',
      namespace,
    },
    reason: 'Started',
    message: 'Started container',
    type: 'Normal',
    count: 1,
    firstTimestamp: new Date(Date.now() - 3600000).toISOString(),
    lastTimestamp: new Date().toISOString(),
  };
}

/**
 * Mock Kubernetes Client
 */
const MockK8sClient = {
  initialized: true,

  init: jest.fn(async () => {
    return { success: true };
  }),

  getNamespaces: jest.fn(async () => {
    return [
      createMockNamespace('default'),
      createMockNamespace('kube-system'),
      createMockNamespace('monitoring'),
    ];
  }),

  getPods: jest.fn(async (namespace = 'default') => {
    return [
      createMockPod('web-pod', namespace),
      createMockPod('api-pod', namespace),
      createMockPod('worker-pod', namespace),
    ];
  }),

  getDeployments: jest.fn(async (namespace = 'default') => {
    return [
      createMockDeployment('web-deployment', namespace),
      createMockDeployment('api-deployment', namespace),
    ];
  }),

  coreApi: {
    listNamespacedEvent: jest.fn(async (namespace = 'default') => {
      return {
        body: {
          items: [
            createMockEvent('startup-event', namespace),
            createMockEvent('scaling-event', namespace),
          ],
        },
      };
    }),
  },
};

/**
 * Mock Kubernetes Healer
 */
const MockK8sHealer = {
  scaleDeployment: jest.fn(async (name, namespace, replicas) => {
    return {
      name,
      namespace,
      replicas,
      status: 'scaled',
    };
  }),

  restartDeployment: jest.fn(async (name, namespace) => {
    return {
      name,
      namespace,
      status: 'restarted',
    };
  }),

  updateImage: jest.fn(async (name, namespace, image) => {
    return {
      name,
      namespace,
      image,
      status: 'updated',
    };
  }),
};

/**
 * Mock Kubernetes Watcher
 */
const MockK8sWatcher = {
  watchPods: jest.fn((namespace, callback) => {
    // Simulate immediate callback with mock data
    callback({
      type: 'ADDED',
      object: createMockPod('monitored-pod', namespace),
    });
    return { stop: jest.fn() };
  }),
};

module.exports = {
  createMockNamespace,
  createMockPod,
  createMockDeployment,
  createMockEvent,
  MockK8sClient,
  MockK8sHealer,
  MockK8sWatcher,
};
