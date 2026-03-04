/**
 * SLO Validation Schemas
 * Using Zod for input validation
 */

const { z } = require('zod');

/**
 * Create SLO validation schema
 */
const createSLOSchema = z.object({
  serviceId: z
    .string()
    .min(1, 'serviceId is required')
    .describe('Service identifier'),
  
  serviceName: z
    .string()
    .min(1, 'serviceName is required')
    .describe('Service display name'),
  
  targetAvailability: z
    .number()
    .min(90, 'targetAvailability must be at least 90%')
    .max(99.999, 'targetAvailability cannot exceed 99.999%')
    .describe('Target availability percentage'),
  
  trackingWindow: z
    .enum(['1day', '7days', '1month'])
    .describe('SLO tracking window'),
  
  alertThreshold: z
    .number()
    .min(0)
    .max(1)
    .optional()
    .describe('Alert threshold (0-1)'),
  
  includeScheduledMaintenance: z
    .boolean()
    .optional()
    .default(false)
    .describe('Include scheduled maintenance in calculations'),
});

/**
 * Update SLO validation schema
 */
const updateSLOSchema = createSLOSchema.partial();

/**
 * Record downtime validation schema
 */
const recordDowntimeSchema = z.object({
  downtimeMinutes: z
    .number()
    .positive('downtimeMinutes must be a positive number')
    .describe('Downtime duration in minutes'),
  
  description: z
    .string()
    .optional()
    .describe('Downtime description'),
});

/**
 * Burndown query validation
 */
const burndownQuerySchema = z.object({
  points: z
    .coerce.number()
    .min(1, 'points must be at least 1')
    .max(100, 'points must be at most 100')
    .optional()
    .default(30)
    .describe('Number of data points (1-100)'),
});

/**
 * SLO ID path parameter validation
 */
const sloIdParamSchema = z.object({
  id: z
    .string()
    .min(1, 'SLO ID is required')
    .describe('SLO definition identifier'),
});

module.exports = {
  createSLOSchema,
  updateSLOSchema,
  recordDowntimeSchema,
  burndownQuerySchema,
  sloIdParamSchema,
};
