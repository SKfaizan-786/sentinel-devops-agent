const CORRELATION_WINDOW_MS = 60 * 1000;
const dependencyGraph = require('./dependency-graph');

class AlertCorrelator {
    constructor() { this.recentAlerts = []; }

    add(alert) {
        const now = Date.now();
        this.recentAlerts = this.recentAlerts.filter(a => now - a.ts < CORRELATION_WINDOW_MS);
        this.recentAlerts.push({ ...alert, ts: now });
        return this.correlate();
    }

    correlate() {
        // Group by Docker Compose project label
        const groups = new Map(); // key -> { alerts, isComposeProject }
        for (const alert of this.recentAlerts) {
            const composeProject = alert.labels?.['com.docker.compose.project'];
            const key = composeProject || alert.containerId;
            if (!groups.has(key)) groups.set(key, { alerts: [], isComposeProject: !!composeProject });
            groups.get(key).alerts.push(alert);
        }

        return [...groups.entries()]
            .filter(([, { alerts }]) => alerts.length > 1)
            .map(([projectKey, { alerts, isComposeProject }]) => {
                const sorted = alerts.sort((a, b) => a.ts - b.ts);
                const rootCauseId = sorted[0].containerId;

                // Only consult the dependency graph — alerts.length > 1 is already
                // guaranteed by the .filter() above so it must not be used here.
                const deps = dependencyGraph.getDependencies(rootCauseId);
                const isSharedDependency = deps.length > 0 ? 1 : 0;

                // Build correlation signals explaining why these alerts are grouped
                const correlationSignals = [];
                if (isComposeProject) {
                    correlationSignals.push('same_compose_project');
                } else {
                    correlationSignals.push('same_container');
                }
                if (isSharedDependency) correlationSignals.push('shared_dependency');
                if (alerts.length > 2) correlationSignals.push('cascade_pattern');

                // Root-cause probability: higher when the dependency graph confirms
                // a shared dependency, lower for project-only correlation
                const rootCauseProbability = isSharedDependency
                    ? Math.min(0.95, 0.7 + (deps.length * 0.05))
                    : Math.min(0.8, 0.5 + (alerts.length * 0.05));

                // Deduplicate container IDs (same container can fire multiple
                // alerts within the correlation window)
                const affectedContainers = [...new Set(alerts.map(a => a.containerId))];

                // Deterministic groupId from sorted container IDs for stable
                // React keys and client-side deduplication
                const stableKey = affectedContainers.slice().sort().join('_');

                return {
                    groupId: `grp_${projectKey}_${stableKey}`,
                    rootCauseContainerId: rootCauseId,
                    rootCauseProbability,
                    affectedContainers,
                    blastRadius: affectedContainers.length + (2 * isSharedDependency),
                    correlationSignals,
                    suppressedAlerts: alerts.length - 1,
                    // Expose per-group alert details so the API can
                    // build complete incident payloads for the frontend
                    alerts: sorted.map(a => ({
                        containerId: a.containerId,
                        ts: a.ts,
                        type: a.type || 'container_failure',
                        labels: a.labels || {},
                    })),
                };
            });
    }
}

module.exports = new AlertCorrelator();
