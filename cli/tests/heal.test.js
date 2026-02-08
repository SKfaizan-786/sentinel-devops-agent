/**
 * Tests for sentinel heal command
 */

import { jest } from '@jest/globals';
import { ConsoleCapture, mockActionResponses, stripAnsi } from './setup.js';

// Mock the API module
const mockTriggerAction = jest.fn();
jest.unstable_mockModule('../src/api.js', () => ({
    getStatus: jest.fn(),
    triggerAction: mockTriggerAction,
    getInsights: jest.fn()
}));

// Import after mocking
const { runAction } = await import('../src/commands.js');

describe('sentinel heal', () => {
    let consoleCapture;

    beforeEach(() => {
        consoleCapture = new ConsoleCapture();
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleCapture.stop();
    });

    it('should heal service successfully', async () => {
        mockTriggerAction.mockResolvedValue(mockActionResponses.healSuccess);
        consoleCapture.start();

        await runAction('auth', 'heal');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Triggering heal on auth');
        expect(output).toContain('Success');
        expect(output).toContain('healed successfully');
        expect(mockTriggerAction).toHaveBeenCalledWith('auth', 'heal');
    });

    it('should handle service not found', async () => {
        mockTriggerAction.mockRejectedValue(new Error('Service not found'));
        consoleCapture.start();

        await runAction('unknown-service', 'heal');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Failed');
        expect(output).toContain('Service not found');
    });

    it('should handle API error gracefully', async () => {
        mockTriggerAction.mockRejectedValue(new Error('Internal server error'));
        consoleCapture.start();

        await runAction('payment', 'heal');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Failed');
        expect(output).toContain('Internal server error');
    });

    it('should heal payment service successfully', async () => {
        mockTriggerAction.mockResolvedValue({ message: 'Payment service healed' });
        consoleCapture.start();

        await runAction('payment', 'heal');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Triggering heal on payment');
        expect(output).toContain('Success');
        expect(mockTriggerAction).toHaveBeenCalledWith('payment', 'heal');
    });

    it('should heal notification service successfully', async () => {
        mockTriggerAction.mockResolvedValue({ message: 'Notification service healed' });
        consoleCapture.start();

        await runAction('notification', 'heal');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Triggering heal on notification');
        expect(output).toContain('Success');
        expect(mockTriggerAction).toHaveBeenCalledWith('notification', 'heal');
    });
});
