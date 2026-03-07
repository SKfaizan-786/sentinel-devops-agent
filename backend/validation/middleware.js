/**
 * Validation Middleware
 * Handles request validation and error responses
 */

/**
 * Validate request body
 * @param {*} schema - Zod schema
 * @returns {Function} Express middleware
 */
function validateBody(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.body);
      req.body = validated;
      next();
    } catch (error) {
      // Guard: Only handle Zod validation errors
      if (error.errors && Array.isArray(error.errors)) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      // Delegate non-validation errors to error handler
      next(error);
    }
  };
}

/**
 * Validate query parameters
 * @param {*} schema - Zod schema
 * @returns {Function} Express middleware
 */
function validateQuery(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.query);
      req.query = validated;
      next();
    } catch (error) {
      // Guard: Only handle Zod validation errors
      if (error.errors && Array.isArray(error.errors)) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      // Delegate non-validation errors to error handler
      next(error);
    }
  };
}

/**
 * Validate params
 * @param {*} schema - Zod schema
 * @returns {Function} Express middleware
 */
function validateParams(schema) {
  return (req, res, next) => {
    try {
      const validated = schema.parse(req.params);
      req.params = validated;
      next();
    } catch (error) {
      // Guard: Only handle Zod validation errors
      if (error.errors && Array.isArray(error.errors)) {
        return res.status(400).json({
          error: 'Invalid URL parameters',
          details: error.errors.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
          })),
        });
      }
      // Delegate non-validation errors to error handler
      next(error);
    }
  };
}

/**
 * Custom validation function
 * Validates data against schema and returns errors
 * @param {*} data - Data to validate
 * @param {*} schema - Zod schema
 * @returns {Object} { valid: boolean, data?: any, errors?: Array }
 */
function validate(data, schema) {
  try {
    const validated = schema.parse(data);
    return { valid: true, data: validated };
  } catch (error) {
    return {
      valid: false,
      errors: error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message,
      })),
    };
  }
}

module.exports = {
  validateBody,
  validateQuery,
  validateParams,
  validate,
};
