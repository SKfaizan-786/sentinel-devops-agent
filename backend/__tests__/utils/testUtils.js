/**
 * Test Utilities
 * Helper functions for setting up Express app and routes for testing
 */

const express = require('express');
const bodyParser = require('body-parser');

/**
 * Create a minimal Express app configured for testing
 * @param {Function} setupRoutes - Function to mount routes on the app
 * @returns {Object} Express app instance
 */
function createTestApp(setupRoutes) {
  const app = express();

  // Middleware
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  // Setup routes
  if (setupRoutes && typeof setupRoutes === 'function') {
    setupRoutes(app);
  }

  // Error handling middleware
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
}

/**
 * Export auth mock implementations for use in test files
 * Note: Test files should apply jest.mock() calls at module top-level for hoisting
 */
const mockAuthMiddlewareImpl = {
  requireAuth: (req, res, next) => {
    const token = req.headers.authorization?.substring(7);
    if (!token) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    req.user = {
      userId: 'test-user',
      email: 'test@example.com',
      permissions: ['read', 'write'],
    };
    next();
  },

  requirePermissions: (...permissions) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      const userPermissions = req.user.permissions || [];
      const hasAll = permissions.every((perm) => userPermissions.includes(perm));

      if (!hasAll) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  },
};

/**
 * Standard test response validators
 */
const validateResponse = {
  /**
   * Validate successful GET list response
   */
  validateListResponse: (response) => {
    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  },

  /**
   * Validate successful GET single resource response
   */
  validateGetResponse: (response) => {
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  },

  /**
   * Validate successful POST response
   */
  validateCreateResponse: (response) => {
    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
  },

  /**
   * Validate successful PUT response
   */
  validateUpdateResponse: (response) => {
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id');
  },

  /**
   * Validate 404 not found response
   */
  validateNotFoundResponse: (response) => {
    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  },

  /**
   * Validate 401 unauthorized response
   */
  validateUnauthorizedResponse: (response) => {
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
  },

  /**
   * Validate 403 forbidden response
   */
  validateForbiddenResponse: (response) => {
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error');
  },

  /**
   * Validate 400 bad request response
   */
  validateBadRequestResponse: (response) => {
    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  },
};

module.exports = {
  createTestApp,
  mockAuthMiddlewareImpl,
  validateResponse,
};
