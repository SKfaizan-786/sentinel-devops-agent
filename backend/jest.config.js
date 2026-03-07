module.exports = {
  testEnvironment: 'node',
  collectCoverageFrom: [
    'routes/**/*.js',
    'slo/**/*.js',
    'docker/**/*.js',
    'kubernetes/**/*.js',
    'auth/**/*.js',
    'services/**/*.js',
    'security/**/*.js',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/__tests__/',
  ],
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js',
  ],
  testPathIgnorePatterns: [
    '/node_modules/',
  ],
  verbose: true,
  forceExit: true,
  clearMocks: true,
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
};
