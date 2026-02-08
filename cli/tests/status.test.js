/**
 * Tests for sentinel status command
 */

import { jest } from '@jest/globals';
import { ConsoleCapture, mockServiceStatus, stripAnsi } from './setup.js';

// Mock the API module
const mockGetStatus = jest.fn();
jest.unstable_mockModule('../src/api.js', () => ({
    getStatus: mockGetStatus,
    triggerAction: jest.fn(),
    getInsights: jest.fn()
}));

// Import after mocking
const { showStatus } = await import('../src/commands.js');

describe('sentinel status', () => {
    let consoleCapture;

    beforeEach(() => {
        consoleCapture = new ConsoleCapture();
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleCapture.stop();
    });

    it('should display all services when healthy', async () => {
        mockGetStatus.mockResolvedValue(mockServiceStatus.healthy);
        consoleCapture.start();

        await showStatus();

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Sentinel System Status');
        expect(output).toContain('AUTH');
        expect(output).toContain('PAYMENT');
        expect(output).toContain('NOTIFICATION');
        expect(output).toContain('200');
    });

    it('should display mixed status with different service states', async () => {
        mockGetStatus.mockResolvedValue(mockServiceStatus.mixed);
        consoleCapture.start();

        await showStatus();

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('AUTH');
        expect(output).toContain('200');
        expect(output).toContain('PAYMENT');
        expect(output).toContain('500');
        expect(output).toContain('NOTIFICATION');
        expect(output).toContain('404');
    });

    it('should handle API failure gracefully', async () => {
        mockGetStatus.mockResolvedValue(null);
        consoleCapture.start();

        await showStatus();

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Could not connect to Sentinel Backend');
    });

    it('should handle empty services object', async () => {
        mockGetStatus.mockResolvedValue(mockServiceStatus.empty);
        consoleCapture.start();

        await showStatus();

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Sentinel System Status');
        // Verify no service rows are rendered - these service names should NOT appear
        expect(output).not.toContain('AUTH');
        expect(output).not.toContain('PAYMENT');
        expect(output).not.toContain('NOTIFICATION');
        // Verify no status codes appear in the output (except in headers)
        expect(output).not.toContain('HEALTHY');
        expect(output).not.toContain('CRITICAL');
        expect(output).not.toContain('DEGRADED');
    });

    it('should display last updated timestamp when available', async () => {
        mockGetStatus.mockResolvedValue(mockServiceStatus.healthy);
        consoleCapture.start();

        await showStatus();

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Last Updated:');
    });
});
