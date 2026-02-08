/**
 * Test Setup and Utilities
 * Shared mocks and helpers for Sentinel CLI tests
 */

/**
 * Captures console.log output for assertion
 */
export class ConsoleCapture {
    constructor() {
        this.logs = [];
        this.originalLog = console.log;
    }

    start() {
        this.logs = [];
        console.log = (...args) => {
            this.logs.push(args.map(arg =>
                typeof arg === 'string' ? arg : JSON.stringify(arg)
            ).join(' '));
        };
    }

    stop() {
        console.log = this.originalLog;
    }

    getOutput() {
        return this.logs.join('\n');
    }

    clear() {
        this.logs = [];
    }
}

/**
 * Mock service status data
 */
export const mockServiceStatus = {
    healthy: {
        services: {
            auth: { code: 200 },
            payment: { code: 200 },
            notification: { code: 200 }
        },
        lastUpdated: new Date().toISOString()
    },
    mixed: {
        services: {
            auth: { code: 200 },
            payment: { code: 500 },
            notification: { code: 404 }
        },
        lastUpdated: new Date().toISOString()
    },
    empty: {
        services: {},
        lastUpdated: new Date().toISOString()
    }
};

/**
 * Mock insights data
 */
export const mockInsights = {
    withIncidents: [
        {
            timestamp: new Date(Date.now() - 3600000).toISOString(),
            analysis: 'CRITICAL: Auth service is down'
        },
        {
            timestamp: new Date(Date.now() - 1800000).toISOString(),
            analysis: 'DEGRADED: Payment service slow response'
        },
        {
            timestamp: new Date().toISOString(),
            analysis: 'HEALTHY: All services operational'
        }
    ],
    allHealthy: [
        {
            timestamp: new Date().toISOString(),
            analysis: 'HEALTHY: All services operational'
        }
    ],
    empty: []
};

/**
 * Mock action responses
 */
export const mockActionResponses = {
    success: { message: 'Action completed successfully' },
    healSuccess: { message: 'Service healed successfully' },
    simulateSuccess: { message: 'Simulation triggered successfully' }
};

/**
 * Strip ANSI codes from string for easier assertion
 */
export const stripAnsi = (str) => {
    // eslint-disable-next-line no-control-regex
    return str.replace(/\u001b\[[0-9;]*m/g, '');
};
