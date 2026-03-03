const k8s = require('@kubernetes/client-node');

class K8sClient {
  constructor() {
    this.kc = new k8s.KubeConfig();
    this.coreApi = null;
    this.appsApi = null;
    this.initialized = false;
  }

  async init() {
    try {
        // Try different auth methods
        if (process.env.KUBERNETES_SERVICE_HOST) {
        // Running inside K8s cluster
        this.kc.loadFromCluster();
        console.log('🔌 Loaded KubeConfig from cluster');
        } else if (process.env.KUBECONFIG) {
        // Use specified kubeconfig file
        this.kc.loadFromFile(process.env.KUBECONFIG);
        console.log(`🔌 Loaded KubeConfig from file: ${process.env.KUBECONFIG}`);
        } else {
        // Use default kubeconfig
        this.kc.loadFromDefault();
        console.log('🔌 Loaded default KubeConfig');
        }

        this.coreApi = this.kc.makeApiClient(k8s.CoreV1Api);
        this.appsApi = this.kc.makeApiClient(k8s.AppsV1Api);
        this.initialized = true;

        // Test connection
        await this.coreApi.listNamespace();
        console.log('✅ Connected to Kubernetes cluster');
    } catch (error) {
        console.error('❌ Failed to connect to Kubernetes cluster:', error.message);
        this.initialized = false;
    }
  }

  async getNamespaces() {
    if (!this.initialized) await this.init();
    try {
        const res = await this.coreApi.listNamespace();
        return res.body.items.map(ns => ({
        name: ns.metadata.name,
        status: ns.status.phase,
        created: ns.metadata.creationTimestamp
        }));
    } catch (error) {
        console.error('Error fetching namespaces:', error.message);
        return [];
    }
  }

  async getPods(namespace = 'default') {
    if (!this.initialized) await this.init();
    try {
        const res = await this.coreApi.listNamespacedPod(namespace);
        return res.body.items.map(pod => this.parsePod(pod));
    } catch (error) {
        console.error(`Error fetching pods for namespace ${namespace}:`, error.message);
        return [];
    }
  }

  parsePod(pod) {
    const containers = pod.status.containerStatuses || [];
    return {
      name: pod.metadata.name,
      namespace: pod.metadata.namespace,
      phase: pod.status.phase,
      ready: containers.every(c => c.ready),
      restartCount: containers.reduce((sum, c) => sum + c.restartCount, 0),
      containers: containers.map(c => ({
        name: c.name,
        ready: c.ready,
        restartCount: c.restartCount,
        state: c.state ? Object.keys(c.state)[0] : 'unknown',
        image: c.image
      })),
      nodeName: pod.spec.nodeName,
      ip: pod.status.podIP,
      started: pod.status.startTime,
      labels: pod.metadata.labels
    };
  }

  async getDeployments(namespace = 'default') {
    if (!this.initialized) await this.init();
    try {
        const res = await this.appsApi.listNamespacedDeployment(namespace);
        return res.body.items.map(dep => ({
        name: dep.metadata.name,
        namespace: dep.metadata.namespace,
        replicas: {
            desired: dep.spec.replicas,
            ready: dep.status.readyReplicas || 0,
            available: dep.status.availableReplicas || 0,
            updated: dep.status.updatedReplicas || 0
        },
        conditions: dep.status.conditions?.map(c => ({
            type: c.type,
            status: c.status,
            reason: c.reason,
            message: c.message
        })),
        strategy: dep.spec.strategy.type,
        created: dep.metadata.creationTimestamp
        }));
    } catch (error) {
        console.error(`Error fetching deployments for namespace ${namespace}:`, error.message);
        return [];
    }
  }
}

module.exports = new K8sClient();
