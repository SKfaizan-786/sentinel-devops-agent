const { listContainers, getContainerHealth } = require('./client');
const { restartContainer } = require('./healer');

class ContainerSupervisor {
    constructor() {
        this.lifecycle = new Map();
        this.healingInProgress = new Set();
    }

    async checkContainers() {
        const containers = await listContainers();

        for (const c of containers) {
            const health = await getContainerHealth(c.id);

            if (
                (health.status === 'unhealthy' || c.status === 'exited') &&
                !this.healingInProgress.has(c.id)
            ) {
                this.handleFailure(c.id);
            }
        }
    }

    async handleFailure(containerId) {
        this.healingInProgress.add(containerId);

        this.lifecycle.set(containerId, {
            detectedAt: Date.now(),
            healingTriggeredAt: Date.now(),
            restoredAt: null
        });

        await restartContainer(containerId);

        const restored = await this.waitForHealthy(containerId);

        if (restored) {
            const record = this.lifecycle.get(containerId);
            record.restoredAt = Date.now();
        }

        this.healingInProgress.delete(containerId);
    }

    async waitForHealthy(containerId, timeout = 300000) {
        const start = Date.now();

        while (Date.now() - start < timeout) {
            const health = await getContainerHealth(containerId);

            if (health.status === 'healthy') {
                return true;
            }

            await new Promise(res => setTimeout(res, 3000));
        }

        return false;
    }

    start(interval = 5000) {
        setInterval(() => {
            this.checkContainers();
        }, interval);
    }

    getLifecycle(containerId) {
        return this.lifecycle.get(containerId);
    }
}

module.exports = new ContainerSupervisor();