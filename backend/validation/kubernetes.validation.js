/**
 * Kubernetes Validation Schemas
 * Input validation for Kubernetes endpoints
 */

const { z } = require('zod');

// DNS-1123 compliant name pattern (lowercase alphanumeric and hyphens, max 63 chars)
const DNS_1123_PATTERN = /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/;

/**
 * Shared namespace validation - reusable across all schemas
 */
const namespaceField = z
  .string()
  .min(1, 'namespace must not be empty')
  .max(63, 'namespace must not exceed 63 characters')
  .regex(DNS_1123_PATTERN, 'namespace must be valid DNS-1123 name (lowercase alphanumeric and hyphens)')
  .optional()
  .default('default')
  .describe('Kubernetes namespace');

/**
 * Namespace query validation
 */
const namespaceQuerySchema = z.object({
  namespace: namespaceField,
});

/**
 * Pod query validation
 */
const podQuerySchema = z.object({
  namespace: namespaceField,
});

/**
 * Deployment query validation
 */
const deploymentQuerySchema = z.object({
  namespace: namespaceField,
});

/**
 * Events query validation
 */
const eventsQuerySchema = z.object({
  namespace: namespaceField,
});

/**
 * Watch pods request validation
 */
const watchPodsSchema = z.object({
  namespace: namespaceField,
});

module.exports = {
  namespaceQuerySchema,
  podQuerySchema,
  deploymentQuerySchema,
  eventsQuerySchema,
  watchPodsSchema,
};
