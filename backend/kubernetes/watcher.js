const k8s = require('@kubernetes/client-node');
const EventEmitter = require('events');
const client = require('./client');

class K8sWatcher extends EventEmitter {
  constructor() {
    super();
    this.watches = new Map();
  }

  async watchPods(namespace, callback) {
    if (!client.initialized) await client.init();
    
    // Check if we are already watching this namespace to avoid duplicates
    if (this.watches.has(`pods:${namespace}`)) return;

    const watch = new k8s.Watch(client.kc);
    
    console.log(`👀 Starting watch for pods in namespace: ${namespace}`);
    
    try {
        const req = await watch.watch(
        `/api/v1/namespaces/${namespace}/pods`,
        {},
        (type, pod) => {
            const parsedPod = client.parsePod(pod);
            callback(type, parsedPod);
            
            // Emit events for specific conditions
            if (type === 'MODIFIED') {
            // Check for OOMKilled
            const oomKilled = pod.status.containerStatuses?.some(
                c => c.lastState?.terminated?.reason === 'OOMKilled'
            );
            if (oomKilled) {
                this.emit('oom', parsedPod);
            }
            
            // Check for CrashLoopBackOff
            const crashLoop = pod.status.containerStatuses?.some(
                c => c.state?.waiting?.reason === 'CrashLoopBackOff'
            );
            if (crashLoop) {
                this.emit('crashloop', parsedPod);
            }
            }
        },
        (err) => {
            console.error('Watch error:', err);
            this.watches.delete(`pods:${namespace}`);
            // Reconnect after delay
            setTimeout(() => this.watchPods(namespace, callback), 5000);
        }
        );
        
        this.watches.set(`pods:${namespace}`, req);
    } catch (err) {
        console.error(`Failed to start watch for pods in ${namespace}:`, err.message);
    }
  }

  async watchEvents(namespace, callback) {
    if (!client.initialized) await client.init();

    if (this.watches.has(`events:${namespace}`)) return;

    const watch = new k8s.Watch(client.kc);
    
    console.log(`👀 Starting watch for events in namespace: ${namespace}`);

    try {
        const req = await watch.watch(
        `/api/v1/namespaces/${namespace}/events`,
        {},
        (type, event) => {
            if (type === 'ADDED' && event.type === 'Warning') {
            callback({
                type: event.type,
                reason: event.reason,
                message: event.message,
                object: {
                kind: event.involvedObject.kind,
                name: event.involvedObject.name,
                namespace: event.involvedObject.namespace
                },
                count: event.count,
                lastSeen: event.lastTimestamp || event.eventTime
            });
            }
        },
        (err) => {
            console.error('Event watch error:', err);
            this.watches.delete(`events:${namespace}`);
             // Reconnect after delay
             setTimeout(() => this.watchEvents(namespace, callback), 5000);
        }
        );
        this.watches.set(`events:${namespace}`, req);
    } catch (err) {
        console.error(`Failed to start watch for events in ${namespace}:`, err.message);
    }
  }

  stopAll() {
    console.log('🛑 Stopping all K8s watches');
    for (const [key, req] of this.watches) {
      if (req.abort) req.abort();
    }
    this.watches.clear();
  }
}

module.exports = new K8sWatcher();
