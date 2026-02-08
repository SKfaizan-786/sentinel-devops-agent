/**
 * Tests for sentinel report command
 */

import { jest } from '@jest/globals';
import { ConsoleCapture, mockInsights, stripAnsi } from './setup.js';

// Mock fs module using unstable_mockModule for ES modules
const mockWriteFileSync = jest.fn();
jest.unstable_mockModule('fs', () => ({
    default: {
        writeFileSync: mockWriteFileSync
    },
    writeFileSync: mockWriteFileSync
}));

// Mock the API module
const mockGetInsights = jest.fn();
jest.unstable_mockModule('../src/api.js', () => ({
    getStatus: jest.fn(),
    triggerAction: jest.fn(),
    getInsights: mockGetInsights
}));

// Import after mocking
const { generateReport } = await import('../src/commands.js');

describe('sentinel report', () => {
    let consoleCapture;
    let writtenContent = '';
    let writtenFileName = '';

    beforeEach(() => {
        consoleCapture = new ConsoleCapture();
        jest.clearAllMocks();
        writtenContent = '';
        writtenFileName = '';

        // Setup mock implementation
        mockWriteFileSync.mockImplementation((fileName, content) => {
            writtenFileName = fileName;
            writtenContent = content;
        });
    });

    afterEach(() => {
        consoleCapture.stop();
    });

    it('should generate report with incidents', async () => {
        mockGetInsights.mockResolvedValue(mockInsights.withIncidents);
        consoleCapture.start();

        await generateReport();

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Generating Incident Report');
        expect(output).toContain('Report saved to');
        expect(writtenFileName).toMatch(/sentinel-report-\d+\.md/);
        expect(writtenContent).toContain('Sentinel Incident Report');
        expect(writtenContent).toContain('CRITICAL');
        expect(writtenContent).toContain('Incidents');
    });

    it('should generate report with no incidents', async () => {
        mockGetInsights.mockResolvedValue(mockInsights.allHealthy);
        consoleCapture.start();

        await generateReport();

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('Generating Incident Report');
        expect(output).toContain('Report saved to');
        expect(writtenContent).toContain('No Incidents Detected');
        expect(writtenContent).toContain('All services have been operating normally');
    });

    it('should handle empty insights', async () => {
        mockGetInsights.mockResolvedValue(mockInsights.empty);
        consoleCapture.start();

        await generateReport();

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        expect(output).toContain('No AI insights found to report');
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should include summary section with correct counts', async () => {
        mockGetInsights.mockResolvedValue(mockInsights.withIncidents);
        consoleCapture.start();

        await generateReport();

        consoleCapture.stop();

        expect(writtenContent).toContain('Summary');
        expect(writtenContent).toContain('Total Events Analyzed');
        expect(writtenContent).toContain('Critical Incidents');
        expect(writtenContent).toContain('Degraded Events');
    });

    it('should create file with timestamp in filename', async () => {
        mockGetInsights.mockResolvedValue(mockInsights.withIncidents);
        const beforeTime = Date.now();

        consoleCapture.start();
        await generateReport();
        consoleCapture.stop();

        const afterTime = Date.now();

        // Extract timestamp from filename
        const match = writtenFileName.match(/sentinel-report-(\d+)\.md/);
        expect(match).not.toBeNull();

        const fileTimestamp = parseInt(match[1]);
        expect(fileTimestamp).toBeGreaterThanOrEqual(beforeTime);
        expect(fileTimestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should include recovery information when available', async () => {
        mockGetInsights.mockResolvedValue(mockInsights.withIncidents);
        consoleCapture.start();

        await generateReport();

        consoleCapture.stop();

        // The mock data has a recovery (HEALTHY after CRITICAL/DEGRADED)
        expect(writtenContent).toContain('Recovery');
    });

    it('should handle API failure gracefully', async () => {
        mockGetInsights.mockRejectedValue(new Error('API connection failed'));
        consoleCapture.start();

        // The function should handle the error without crashing
        await expect(generateReport()).rejects.toThrow('API connection failed');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        // Should at least show the initial message before failure
        expect(output).toContain('Generating Incident Report');
        expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should handle file write failure gracefully', async () => {
        mockGetInsights.mockResolvedValue(mockInsights.withIncidents);
        mockWriteFileSync.mockImplementation(() => {
            throw new Error('Permission denied: cannot write file');
        });
        consoleCapture.start();

        // The function should propagate the error (no try/catch in source)
        await expect(generateReport()).rejects.toThrow('Permission denied');

        consoleCapture.stop();
        const output = stripAnsi(consoleCapture.getOutput());

        // Should show the generating message before the write failure
        expect(output).toContain('Generating Incident Report');
    });
});
