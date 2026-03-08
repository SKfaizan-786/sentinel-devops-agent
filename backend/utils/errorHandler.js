/**
 * Centralized Error Handler Utility
 * 
 * This utility provides consistent error handling for asynchronous operations
 * throughout the backend, particularly for fire-and-forget database operations
 * like insertActivityLog and insertAIReport.
 * 
 * Purpose:
 * - Prevent silent failures in async operations
 * - Provide structured error logging with timestamps
 * - Include context for better debugging
 * - Maintain clean error handling patterns across codebase
 */

/**
 * Handles asynchronous errors with structured logging
 * @param {Error} error - The error object from the failed operation
 * @param {string} context - Optional context describing where the error occurred
 * @param {Object} metadata - Optional additional metadata for debugging
 */
function handleAsyncError(error, context = 'Unknown', metadata = {}) {
  const timestamp = new Date().toISOString();
  const errorId = generateErrorId();
  
  // Build structured error message
  const errorMessage = {
    errorId,
    timestamp,
    context,
    message: error.message || 'Unknown error occurred',
    stack: error.stack,
    metadata
  };
  
  // Log to stderr for proper error stream handling
  console.error(`[ASYNC_ERROR:${errorId}] ${context}:`, errorMessage);
  
  // In production, you might want to:
  // - Send to error monitoring service (Sentry, DataDog, etc.)
  // - Store in error database table
  // - Trigger alerts for critical errors
  
  return errorId;
}

/**
 * Generates a unique error ID for tracking
 * @returns {string} Unique error identifier
 */
function generateErrorId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

/**
 * Handles async errors specifically for database operations
 * @param {Error} error - The error object from database operation
 * @param {string} operation - The database operation that failed (e.g., 'insertActivityLog')
 * @param {Object} data - Optional data that was being processed
 */
function handleDatabaseError(error, operation, data = {}) {
  return handleAsyncError(error, `Database Operation: ${operation}`, {
    operation,
    dataType: typeof data,
    hasData: Object.keys(data).length > 0
  });
}

/**
 * Handles async errors specifically for external API calls
 * @param {Error} error - The error object from API call
 * @param {string} apiService - The external service name
 * @param {string} endpoint - The API endpoint that was called
 */
function handleApiError(error, apiService, endpoint) {
  return handleAsyncError(error, `External API: ${apiService}`, {
    apiService,
    endpoint,
    statusCode: error.response?.status || 'N/A'
  });
}

module.exports = {
  handleAsyncError,
  handleDatabaseError,
  handleApiError,
  generateErrorId
};
