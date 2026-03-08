/**
 * Jest Setup File
 * Runs before all test suites to configure the testing environment
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing-only';
process.env.PORT = 4001;

// Suppress console output during tests
if (process.env.DEBUG_TEST !== 'true') {
  global.console = {
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Mock dotenv to prevent loading .env files during tests
jest.mock('dotenv', () => ({
  config: jest.fn(),
}));
