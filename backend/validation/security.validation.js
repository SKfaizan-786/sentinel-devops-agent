/**
 * Security Validation Schemas
 * Input validation for security endpoints
 */

const { z } = require('zod');

/**
 * Image scan query validation
 */
const imageScanSchema = z.object({
  imageId: z
    .string()
    .min(1, 'imageId is required')
    .describe('Docker image ID or name'),
});

/**
 * Security policy validation schema
 */
const policySchema = z.object({
  allowedSeverities: z
    .array(z.enum(['low', 'medium', 'high', 'critical']))
    .min(1, 'At least one allowed severity level is required')
    .describe('Allowed vulnerability severity levels'),
  
  blockedImages: z
    .array(z.string())
    .optional()
    .default([])
    .describe('List of blocked image names/IDs'),
  
  scanFrequency: z
    .string()
    .regex(/^(\d+|\*|\?|,|\-|\/)+\s+(\d+|\*|\?|,|\-|\/)+\s+(\d+|\*|\?|,|\-|\/)+\s+(\d+|\*|\?|,|\-|\/)+\s+(\d+|\*|\?|,|\-|\/|#)+$/, 
           'scanFrequency must be a valid cron expression (e.g., "0 0 * * *")')
    .describe('Scan frequency as cron expression (e.g., "0 0 * * *")'),
  
  requireCompliancePass: z
    .boolean()
    .optional()
    .default(true)
    .describe('Require images to pass compliance'),
});

/**
 * Scan all containers query
 */
const scanAllSchema = z.object({
  force: z
    .enum(['true', 'false'])
    .transform((val) => val === 'true')
    .optional()
    .describe('Force rescan even if cached'),
});

module.exports = {
  imageScanSchema,
  policySchema,
  scanAllSchema,
};
