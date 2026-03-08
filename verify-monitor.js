const monitor = require('./backend/docker/monitor');
const { listContainers } = require('./backend/docker/client');

async function verify() {
    console.log('🧪 Starting Performance Verification...');
    try {
        const containers = await listContainers();
        await Promise.allSettled(containers.map(c => monitor.startMonitoring(c.id)));
        console.log(`✅ Started monitoring for ${containers.length} containers.`);

        console.log('⏳ Waiting for initial poll...');
        await new Promise(resolve => setTimeout(resolve, 5000));

        const collected = containers
            .map(c => ({ id: c.id, metrics: monitor.getMetrics(c.id) }))
            .filter(x => x.metrics);

        console.log(`📊 Collected metrics for ${collected.length} containers.`);
        if (collected.length === 0) {
            console.warn('⚠️ No metrics collected. This might be expected if no containers are running or labeling is missing.');
        }

        containers.forEach(c => monitor.stopMonitoring(c.id));
        console.log('🧪 Verification complete.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Verification failed:', error);
        process.exit(1);
    }
}

verify();
