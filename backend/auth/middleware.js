/**
 * @fileoverview Authentication and authorization middleware for Sentinel RBAC system
 * @module backend/auth/middleware
 * @requires ./AuthService
 * @requires ./RBACService
 * @requires ./ApiKeyService
 * @requires ./RateLimiterService
 */

const AuthService = require('./AuthService');
const RBACService = require('./RBACService');
const ApiKeyService = require('./ApiKeyService');
const RateLimiterService = require('./RateLimiterService');

/**
 * Middleware to require JWT authentication
 * Validates JWT token from Authorization header and attaches user context to request
 * 
 * @function requireAuth
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers.authorization - Bearer token in format "Bearer <token>"
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * 
 * @example
 * // Usage in route
 * router.get('/protected', requireAuth, (req, res) => {
 *   console.log(req.user.userId); // User context available
 * });
 * 
 * @throws {401} Missing or invalid authorization header
 * @throws {401} Invalid or expired token
 */
function requireAuth(req, res, next) {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Validate token
    const payload = AuthService.validateAccessToken(token);
    
    // Attach user context to request
    req.user = {
      userId: payload.userId,
      email: payload.email,
      organizationId: payload.organizationId,
      roles: payload.roles,
      permissions: payload.permissions
    };
    
    next();
  } catch (error) {
    return res.status(401).json({ error: error.message || 'Invalid or expired token' });
  }
}

/**
 * Middleware factory to require specific permissions (AND logic)
 * All specified permissions must be present in user's permission set
 * 
 * @function requirePermissions
 * @param {...string} permissions - One or more permission names required
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Single permission
 * router.post('/users', requireAuth, requirePermissions('users:write'), handler);
 * 
 * @example
 * // Multiple permissions (all required)
 * router.delete('/users/:id', 
 *   requireAuth, 
 *   requirePermissions('users:delete', 'admin:access'), 
 *   handler
 * );
 * 
 * @throws {401} Authentication required (no user context)
 * @throws {403} Insufficient permissions (missing one or more required permissions)
 */
function requirePermissions(...permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user has all required permissions
      const userPermissions = req.user.permissions || [];
      const hasAll = permissions.every(perm => userPermissions.includes(perm));
      
      if (!hasAll) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissions,
          current: userPermissions
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware factory to require any permission (OR logic)
 * At least one of the specified permissions must be present in user's permission set
 * 
 * @function requireAnyPermission
 * @param {...string} permissions - One or more permission names (any one required)
 * @returns {Function} Express middleware function
 * 
 * @example
 * // User needs either read or write permission
 * router.get('/data', 
 *   requireAuth, 
 *   requireAnyPermission('data:read', 'data:write'), 
 *   handler
 * );
 * 
 * @throws {401} Authentication required (no user context)
 * @throws {403} Insufficient permissions (none of the required permissions present)
 */
function requireAnyPermission(...permissions) {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      // Check if user has at least one required permission
      const userPermissions = req.user.permissions || [];
      const hasAny = permissions.some(perm => userPermissions.includes(perm));
      
      if (!hasAny) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: permissions,
          current: userPermissions
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Permission check failed' });
    }
  };
}

/**
 * Middleware factory to require specific role
 * User must have the specified role assigned
 * 
 * @function requireRole
 * @param {string} roleName - Name of the required role (e.g., 'Admin', 'Operator')
 * @returns {Function} Express middleware function
 * 
 * @example
 * // Only admins can access
 * router.get('/admin/dashboard', requireAuth, requireRole('Admin'), handler);
 * 
 * @throws {401} Authentication required (no user context)
 * @throws {403} Insufficient permissions (role not assigned to user)
 */
function requireRole(roleName) {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userRoles = req.user.roles || [];
      
      if (!userRoles.includes(roleName)) {
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: roleName,
          current: userRoles
        });
      }
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Role check failed' });
    }
  };
}

/**
 * Middleware for API key authentication
 * Validates API key from X-API-Key header and attaches key context to request
 * 
 * @function requireApiKey
 * @param {Object} req - Express request object
 * @param {Object} req.headers - Request headers
 * @param {string} req.headers['x-api-key'] - API key in format "sk_<org>_<random>"
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * 
 * @example
 * // Usage in route
 * router.get('/api/data', requireApiKey, (req, res) => {
 *   console.log(req.apiKey.userId); // API key context available
 * });
 * 
 * @throws {401} Missing API key
 * @throws {401} Invalid or expired API key
 */
function requireApiKey(req, res, next) {
  try {
    // Extract API key from header
    const apiKey = req.headers['x-api-key'];
    
    if (!apiKey) {
      return res.status(401).json({ error: 'Missing API key' });
    }
    
    // Validate API key
    ApiKeyService.validateApiKey(apiKey)
      .then(keyData => {
        // Attach API key context to request
        req.apiKey = {
          userId: keyData.userId,
          organizationId: keyData.orgId,
          permissions: keyData.permissions,
          keyId: keyData.keyId
        };
        
        next();
      })
      .catch(error => {
        return res.status(401).json({ error: error.message || 'Invalid API key' });
      });
  } catch (error) {
    return res.status(401).json({ error: 'API key validation failed' });
  }
}

/**
 * Middleware factory for rate limiting
 * Limits number of requests per time window based on IP or user ID
 * 
 * @function rateLimit
 * @param {number} maxRequests - Maximum requests allowed in time window
 * @param {number} windowMs - Time window in milliseconds
 * @returns {Function} Express middleware function
 * 
 * @example
 * // 5 requests per minute
 * router.post('/auth/login', rateLimit(5, 60 * 1000), handler);
 * 
 * @example
 * // 100 requests per hour
 * router.get('/api/data', requireAuth, rateLimit(100, 60 * 60 * 1000), handler);
 * 
 * @throws {429} Too many requests (rate limit exceeded)
 * 
 * @description
 * Adds the following headers to response:
 * - X-RateLimit-Limit: Maximum requests allowed
 * - X-RateLimit-Remaining: Requests remaining in current window
 * - X-RateLimit-Reset: ISO timestamp when limit resets
 * - Retry-After: Seconds until limit resets (only on 429)
 */
function rateLimit(maxRequests, windowMs) {
  return async (req, res, next) => {
    try {
      // Use IP address as key (or user ID if authenticated)
      const key = req.user?.userId || req.ip || req.connection.remoteAddress;
      
      const limitStatus = await RateLimiterService.checkLimit(key, maxRequests, windowMs);
      
      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', limitStatus.remaining);
      res.setHeader('X-RateLimit-Reset', limitStatus.resetAt.toISOString());
      
      if (!limitStatus.allowed) {
        const retryAfter = Math.ceil((limitStatus.resetAt - new Date()) / 1000);
        res.setHeader('Retry-After', retryAfter);
        
        return res.status(429).json({ 
          error: 'Too many requests',
          retryAfter: limitStatus.resetAt
        });
      }
      
      next();
    } catch (error) {
      // Don't block request if rate limiting fails
      console.error('Rate limiting error:', error);
      next();
    }
  };
}

/**
 * Middleware to check organization access
 * Ensures user belongs to the organization they're trying to access
 * Validates organization ID from request params or body against user's organization
 * 
 * @function requireOrganization
 * @param {Object} req - Express request object
 * @param {Object} req.params - URL parameters
 * @param {string} [req.params.organizationId] - Organization ID from URL
 * @param {Object} req.body - Request body
 * @param {string} [req.body.organizationId] - Organization ID from body
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 * @returns {void}
 * 
 * @example
 * // Protect organization-specific routes
 * router.get('/orgs/:organizationId/users', 
 *   requireAuth, 
 *   requireOrganization, 
 *   handler
 * );
 * 
 * @throws {401} Authentication required (no user context)
 * @throws {403} Access denied to this organization (cross-tenant access attempt)
 */
function requireOrganization(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Get organization ID from params or body
    const targetOrgId = req.params.organizationId || req.body.organizationId;
    
    if (!targetOrgId) {
      return next(); // No organization check needed
    }
    
    // Check if user belongs to the organization
    if (req.user.organizationId !== targetOrgId) {
      return res.status(403).json({ error: 'Access denied to this organization' });
    }
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Organization check failed' });
  }
}

module.exports = {
  requireAuth,
  requirePermissions,
  requireAnyPermission,
  requireRole,
  requireApiKey,
  rateLimit,
  requireOrganization
};
