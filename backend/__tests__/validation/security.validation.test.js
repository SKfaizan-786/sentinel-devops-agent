/**
 * Security Validation Tests
 * 
 * Tests for Zod schemas validating security endpoint inputs
 */

const {
  imageScanSchema,
  policySchema,
  scanAllSchema,
} = require('../../validation/security.validation');

describe('Security Validation Schemas', () => {
  describe('imageScanSchema', () => {
    it('should validate correct imageId', () => {
      const valid = { imageId: 'nginx:latest' };
      const result = imageScanSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate imageId with multiple slashes', () => {
      const valid = { imageId: 'gcr.io/my-project/my-service:v1.2.3' };
      const result = imageScanSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate imageId with digest', () => {
      const valid = { imageId: 'nginx@sha256:abc123def456' };
      const result = imageScanSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject missing imageId', () => {
      const invalid = {};
      const result = imageScanSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty imageId', () => {
      const invalid = { imageId: '' };
      const result = imageScanSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-string imageId', () => {
      const invalid = { imageId: 12345 };
      const result = imageScanSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('policySchema', () => {
    it('should validate correct policy', () => {
      const valid = {
        allowedSeverities: ['low', 'medium'],
        blockedImages: [],
        scanFrequency: '0 0 * * *', // Cron expression
        requireCompliancePass: true,
      };
      const result = policySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate policy with all severity levels', () => {
      const valid = {
        allowedSeverities: ['low', 'medium', 'high', 'critical'],
        blockedImages: ['untrusted/*'],
        scanFrequency: '0 12 * * *',
        requireCompliancePass: false,
      };
      const result = policySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate policy with blocked images', () => {
      const valid = {
        allowedSeverities: ['low', 'medium', 'high'],
        blockedImages: ['untrusted/badimage:*', 'blacklisted/*'],
        scanFrequency: '0 2 * * 0', // Weekly
        requireCompliancePass: true,
      };
      const result = policySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject invalid severity level', () => {
      const invalid = {
        allowedSeverities: ['low', 'severe'],
        blockedImages: [],
        scanFrequency: '0 0 * * *',
        requireCompliancePass: true,
      };
      const result = policySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing allowedSeverities', () => {
      const invalid = {
        blockedImages: [],
        scanFrequency: '0 0 * * *',
        requireCompliancePass: true,
      };
      const result = policySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty allowedSeverities array', () => {
      const invalid = {
        allowedSeverities: [],
        blockedImages: [],
        scanFrequency: '0 0 * * *',
        requireCompliancePass: true,
      };
      const result = policySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid scanFrequency pattern', () => {
      const invalid = {
        allowedSeverities: ['low', 'medium'],
        blockedImages: [],
        scanFrequency: 'not-a-cron',
        requireCompliancePass: true,
      };
      const result = policySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing scanFrequency', () => {
      const invalid = {
        allowedSeverities: ['low'],
        blockedImages: [],
        requireCompliancePass: true,
      };
      const result = policySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-boolean requireCompliancePass', () => {
      const invalid = {
        allowedSeverities: ['low', 'medium'],
        blockedImages: [],
        scanFrequency: '0 0 * * *',
        requireCompliancePass: 'true',
      };
      const result = policySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-array blockedImages', () => {
      const invalid = {
        allowedSeverities: ['low'],
        blockedImages: 'untrusted/*',
        scanFrequency: '0 0 * * *',
        requireCompliancePass: true,
      };
      const result = policySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should validate various cron patterns', () => {
      const cronPatterns = [
        '0 0 * * *', // Daily at midnight
        '0 12 * * *', // Daily at noon
        '0 2 * * 0', // Weekly on Sunday
        '*/5 * * * *', // Every 5 minutes
        '0 0 1 * *', // Monthly on first day
      ];
      
      cronPatterns.forEach(pattern => {
        const valid = {
          allowedSeverities: ['low'],
          blockedImages: [],
          scanFrequency: pattern,
          requireCompliancePass: true,
        };
        const result = policySchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('scanAllSchema', () => {
    it('should validate with force=true', () => {
      const valid = { force: 'true' };
      const result = scanAllSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate with force=false', () => {
      const valid = { force: 'false' };
      const result = scanAllSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty query (defaults applied)', () => {
      const valid = {};
      const result = scanAllSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should coerce string "true" to boolean', () => {
      const valid = { force: 'true' };
      const result = scanAllSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.force).toBe('boolean');
      }
    });

    it('should coerce string "false" to boolean', () => {
      const valid = { force: 'false' };
      const result = scanAllSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.force).toBe('boolean');
      }
    });

    it('should handle case-insensitive force parameter', () => {
      const validFormats = ['true', 'false'];
      validFormats.forEach(format => {
        const valid = { force: format };
        const result = scanAllSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });
  });
});
