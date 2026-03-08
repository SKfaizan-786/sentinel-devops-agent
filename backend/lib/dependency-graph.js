// backend/lib/dependency-graph.js
class DependencyGraph {
    constructor() {
        this.dependencies = new Map(); // containerId -> Set of dependencies
    }

    addDependency(container, dependency) {
        if (!this.dependencies.has(container)) {
            this.dependencies.set(container, new Set());
        }
        this.dependencies.get(container).add(dependency);
    }

    getDependencies(containerId) {
        return this.dependencies.get(containerId) ? Array.from(this.dependencies.get(containerId)) : [];
    }

    /**
     * Clear all recorded dependencies for a specific container.
     * Should be called when a container is removed or stops being monitored.
     */
    clearContainer(containerId) {
        this.dependencies.delete(containerId);
        // Also remove this container from other containers' dependency sets
        for (const [, deps] of this.dependencies) {
            deps.delete(containerId);
        }
    }

    /**
     * Build dependency edges from Docker Compose labels for a set of containers.
     * Containers in the same Compose project that share a network are considered
     * dependencies of one another (the depends_on relationship is captured via
     * com.docker.compose.depends_on when available).
     */
    populateFromContainers(containersInfo) {
        // Group containers by Compose project
        const projectGroups = new Map(); // project -> [{ id, service, dependsOn, networks }]

        for (const info of containersInfo) {
            const labels = info.Config?.Labels || {};
            const project = labels['com.docker.compose.project'];
            if (!project) continue;

            const service = labels['com.docker.compose.service'] || '';
            const dependsOn = labels['com.docker.compose.depends_on'] || '';
            const networkNames = Object.keys(info.NetworkSettings?.Networks || {});

            if (!projectGroups.has(project)) projectGroups.set(project, []);
            projectGroups.get(project).push({
                id: info.Id,
                service,
                dependsOn: dependsOn ? dependsOn.split(',').map(s => s.split(':')[0].trim()).filter(Boolean) : [],
                networks: networkNames,
            });
        }

        // Build edges within each project
        for (const [, members] of projectGroups) {
            const serviceToId = new Map();
            for (const m of members) {
                if (m.service) serviceToId.set(m.service, m.id);
            }

            for (const m of members) {
                // Explicit depends_on edges
                for (const depService of m.dependsOn) {
                    const depId = serviceToId.get(depService);
                    if (depId && depId !== m.id) {
                        this.addDependency(m.id, depId);
                    }
                }

                // Shared-network edges (weaker signal, only if no explicit depends_on)
                if (m.dependsOn.length === 0) {
                    for (const other of members) {
                        if (other.id === m.id) continue;
                        const sharedNetworks = m.networks.filter(n => other.networks.includes(n));
                        if (sharedNetworks.length > 0) {
                            this.addDependency(m.id, other.id);
                        }
                    }
                }
            }
        }
    }
}

module.exports = new DependencyGraph();
