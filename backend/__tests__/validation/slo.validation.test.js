/**
 * SLO Validation Tests
 * 
 * Tests for Zod schemas validating SLO endpoint inputs
 */

const {
  createSLOSchema,
  updateSLOSchema,
  recordDowntimeSchema,
  burndownQuerySchema,
} = require('../../validation/slo.validation');

describe('SLO Validation Schemas', () => {
  describe('createSLOSchema', () => {
    it('should validate a correct SLO creation payload', () => {
      const valid = {
        serviceId: 'svc-123',
        serviceName: 'My Service',
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const result = createSLOSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate minimum availability (90%)', () => {
      const valid = {
        serviceId: 'svc-123',
        serviceName: 'My Service',
        targetAvailability: 90,
        trackingWindow: '1day',
      };
      const result = createSLOSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate maximum availability (99.999%)', () => {
      const valid = {
        serviceId: 'svc-123',
        serviceName: 'My Service',
        targetAvailability: 99.999,
        trackingWindow: '7days',
      };
      const result = createSLOSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject availability below 90%', () => {
      const invalid = {
        serviceId: 'svc-123',
        serviceName: 'My Service',
        targetAvailability: 89.9,
        trackingWindow: '1day',
      };
      const result = createSLOSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject availability above 99.999%', () => {
      const invalid = {
        serviceId: 'svc-123',
        serviceName: 'My Service',
        targetAvailability: 100,
        trackingWindow: '1day',
      };
      const result = createSLOSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject invalid trackingWindow', () => {
      const invalid = {
        serviceId: 'svc-123',
        serviceName: 'My Service',
        targetAvailability: 99.9,
        trackingWindow: 'invalid',
      };
      const result = createSLOSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing serviceId', () => {
      const invalid = {
        serviceName: 'My Service',
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const result = createSLOSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing serviceName', () => {
      const invalid = {
        serviceId: 'svc-123',
        targetAvailability: 99.9,
        trackingWindow: '1month',
      };
      const result = createSLOSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept all valid trackingWindow values', () => {
      const windows = ['1day', '7days', '1month'];
      windows.forEach(window => {
        const valid = {
          serviceId: 'svc-123',
          serviceName: 'My Service',
          targetAvailability: 99.9,
          trackingWindow: window,
        };
        const result = createSLOSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('updateSLOSchema', () => {
    it('should validate partial SLO update', () => {
      const valid = {
        targetAvailability: 99.5,
      };
      const result = updateSLOSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty object for partial update', () => {
      const valid = {};
      const result = updateSLOSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate all valid trackingWindow values in update', () => {
      const windows = ['1day', '7days', '1month'];
      windows.forEach(window => {
        const valid = {
          trackingWindow: window,
        };
        const result = updateSLOSchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });

    it('should reject invalid trackingWindow in update', () => {
      const invalid = {
        trackingWindow: 'invalid',
      };
      const result = updateSLOSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('recordDowntimeSchema', () => {
    it('should validate correct downtime record', () => {
      const valid = {
        downtimeMinutes: 30,
        description: 'Planned maintenance',
      };
      const result = recordDowntimeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate downtime without description', () => {
      const valid = {
        downtimeMinutes: 15,
      };
      const result = recordDowntimeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject zero downtime minutes', () => {
      const invalid = {
        downtimeMinutes: 0,
        description: 'Invalid',
      };
      const result = recordDowntimeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject negative downtime minutes', () => {
      const invalid = {
        downtimeMinutes: -10,
        description: 'Invalid',
      };
      const result = recordDowntimeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric downtime minutes', () => {
      const invalid = {
        downtimeMinutes: 'thirty',
        description: 'Invalid',
      };
      const result = recordDowntimeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject missing downtimeMinutes', () => {
      const invalid = {
        description: 'No downtime specified',
      };
      const result = recordDowntimeSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should accept large downtime values', () => {
      const valid = {
        downtimeMinutes: 1440, // 24 hours
        description: 'Extended outage',
      };
      const result = recordDowntimeSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('burndownQuerySchema', () => {
    it('should validate correct points parameter', () => {
      const valid = { points: 30 };
      const result = burndownQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate minimum points (1)', () => {
      const valid = { points: 1 };
      const result = burndownQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate maximum points (100)', () => {
      const valid = { points: 100 };
      const result = burndownQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should accept empty query (defaults applied)', () => {
      const valid = {};
      const result = burndownQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject points below 1', () => {
      const invalid = { points: 0 };
      const result = burndownQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject points above 100', () => {
      const invalid = { points: 101 };
      const result = burndownQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject non-numeric points', () => {
      const invalid = { points: 'thirty' };
      const result = burndownQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });
});
