const express = require('express');
const router = express.Router();
const client = require('../kubernetes/client');
const healer = require('../kubernetes/healer');
const watcher = require('../kubernetes/watcher');
const { logActivity } = require('../services/incidents');
const { validateQuery, validateBody } = require('../validation/middleware');
const {
  podQuerySchema,
  deploymentQuerySchema,
  eventsQuerySchema,
  watchPodsSchema,
} = require('../validation/kubernetes.validation');

// Initialize client if not already
client.init().catch(err => console.error('K8s client init failed on route load:', err.message));

router.get('/namespaces', async (req, res) => {
    try {
        const namespaces = await client.getNamespaces();
        res.json(namespaces);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/pods', validateQuery(podQuerySchema), async (req, res) => {
    const { namespace } = req.query;
    try {
        const pods = await client.getPods(namespace);
        res.json(pods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/deployments', validateQuery(deploymentQuerySchema), async (req, res) => {
    const { namespace } = req.query;
    try {
        const deployments = await client.getDeployments(namespace);
        res.json(deployments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/events', validateQuery(eventsQuerySchema), async (req, res) => {
    const { namespace } = req.query;
    try {
        // We'll use coreApi to list events
        if (!client.initialized) await client.init();
        const response = await client.coreApi.listNamespacedEvent(namespace);
        
        const events = response.body.items.map(event => ({
             type: event.type,
             reason: event.reason,
             message: event.message,
             object: {
                 kind: event.involvedObject.kind,
                 name: event.involvedObject.name,
                 namespace: event.involvedObject.namespace
             },
             count: event.count,
             lastSeen: event.lastTimestamp || event.eventTime || event.metadata.creationTimestamp
        })).sort((a,b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()); // Sort by newest

        res.json(events);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/watch/pods', validateBody(watchPodsSchema), async (req, res) => {
    const { namespace } = req.body;
    // This endpoint initiates watching for SSE/WebSocket on the frontend, 
    // but the actual data stream is likely handled via WebSocket or SSE.
    // For now, we just start the watcher in the backend which emits events.
    // Ideally, we'd have a WebSocket connection subscribing to these events.
    
    // We already have a WebSocket broadcaster in index.js. 
    // We need to hook the watcher events to that broadcaster.
    // For now, we can just ensure the watcher is started.
    
    try {
        // We'll rely on the main app to hook up the watcher events to the websocket.
        // Or we can start it here.
        // Note: watcher.watchPods requires a callback.
        
        // This endpoint might just be to confirm we are interested in a namespace?
        res.json({ success: true, message: `Watching namespace ${namespace}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/pod/:namespace/:name/delete', async (req, res) => {
    const { namespace, name } = req.params;
    try {
        logActivity('warn', `K8s: Deleting pod ${name} in ${namespace}`);
        const result = await healer.deletePod(namespace, name);
        logActivity('success', `K8s: Pod ${name} deleted successfully`);
        res.json(result);
    } catch (error) {
        logActivity('error', `K8s: Failed to delete pod ${name}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

router.post('/deployment/:namespace/:name/scale', async (req, res) => {
    const { namespace, name } = req.params;
    const { replicas } = req.body;
    try {
        logActivity('info', `K8s: Scaling deployment ${name} to ${replicas}`);
        const result = await healer.scaleDeployment(namespace, name, replicas);
        res.json(result);
    } catch (error) {
        logActivity('error', `K8s: Failed to scale deployment ${name}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

router.post('/deployment/:namespace/:name/restart', async (req, res) => {
    const { namespace, name } = req.params;
    try {
        logActivity('info', `K8s: Rolling restart for deployment ${name}`);
        const result = await healer.restartDeployment(namespace, name);
        res.json(result);
    } catch (error) {
        logActivity('error', `K8s: Failed to restart deployment ${name}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

router.post('/deployment/:namespace/:name/rollback', async (req, res) => {
    const { namespace, name } = req.params;
    try {
        logActivity('warn', `K8s: Rolling back deployment ${name}`);
        const result = await healer.rollbackDeployment(namespace, name);
        res.json(result);
    } catch (error) {
        logActivity('error', `K8s: Failed to rollback deployment ${name}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
