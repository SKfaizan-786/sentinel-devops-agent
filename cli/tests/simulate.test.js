/**
 * Tests for sentinel simulate command
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

describe('sentinel simulate', () => {
    let consoleCapture;

    beforeEach(() => {
        consoleCapture = new ConsoleCapture();
        jest.clearAllMocks();
    });

    afterEach(() => {
        consoleCapture.stop();
    });

    it('should simulate service down successfully', async () => {
        mockTriggerAction.mockResolvedValue(mockActionResponses.simulateSuccess);
        consoleCapture.start();

        await runAction('auth', 'down');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Triggering down on auth');
        expect(output).toContain('Success');
        expect(mockTriggerAction).toHaveBeenCalledWith('auth', 'down');
    });

    it('should simulate service slow successfully', async () => {
        mockTriggerAction.mockResolvedValue(mockActionResponses.simulateSuccess);
        consoleCapture.start();

        await runAction('payment', 'slow');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Triggering slow on payment');
        expect(output).toContain('Success');
        expect(mockTriggerAction).toHaveBeenCalledWith('payment', 'slow');
    });

    it('should handle invalid service gracefully', async () => {
        mockTriggerAction.mockRejectedValue(new Error('Service not found'));
        consoleCapture.start();

        await runAction('unknown-service', 'down');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Failed');
        expect(output).toContain('Service not found');
    });

    it('should handle network error gracefully', async () => {
        mockTriggerAction.mockRejectedValue(new Error('Network error'));
        consoleCapture.start();

        await runAction('auth', 'down');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Failed');
        expect(output).toContain('Network error');
    });

    it('should simulate healthy mode successfully', async () => {
        mockTriggerAction.mockResolvedValue({ message: 'Service restored to healthy' });
        consoleCapture.start();

        await runAction('notification', 'healthy');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Triggering healthy on notification');
        expect(output).toContain('Success');
        expect(mockTriggerAction).toHaveBeenCalledWith('notification', 'healthy');
    });
});
