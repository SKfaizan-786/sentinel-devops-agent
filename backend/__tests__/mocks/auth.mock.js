/**
 * Mock Authentication Service
 * Provides test utilities for creating valid JWT tokens and mocking auth middleware
 */

const jwt = require('jsonwebtoken');

const TEST_JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing-only';

/**
 * Generate a valid test JWT token
 * @param {Object} payload - Token claims
 * @param {string} payload.userId - User ID
 * @param {string} payload.email - User email
 * @param {string} payload.organizationId - Organization ID
 * @param {Array} payload.roles - User roles
 * @param {Array} payload.permissions - User permissions
 * @returns {string} Valid JWT token
 */
function generateTestToken(payload = {}) {
  const defaults = {
    userId: 'test-user-123',
    email: 'test@example.com',
    organizationId: 'test-org-456',
    roles: ['admin'],
    permissions: ['slo:read', 'slo:write', 'users:read', 'users:write', 'security:read', 'security:write'],
  };

  const tokenPayload = { ...defaults, ...payload };
  return jwt.sign(tokenPayload, TEST_JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Create authenticated request headers
 * @param {Object} tokenPayload - Token payload customizations
 * @returns {Object} Headers with Authorization token
 */
function getAuthHeaders(tokenPayload = {}) {
  const token = generateTestToken(tokenPayload);
  return {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Create unauthorized request headers (no token)
 * @returns {Object} Headers without Authorization token
 */
function getUnauthHeaders() {
  return {
    'Content-Type': 'application/json',
  };
}

/**
 * Mock AuthService module
 */
const MockAuthService = {
  validateAccessToken: (token) => {
    try {
      return jwt.verify(token, TEST_JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  },
};

module.exports = {
  generateTestToken,
  getAuthHeaders,
  getUnauthHeaders,
  MockAuthService,
};
