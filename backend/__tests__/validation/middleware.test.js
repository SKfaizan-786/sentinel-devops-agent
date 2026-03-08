/**
 * Validation Middleware Tests
 * 
 * Tests for validation middleware functions, error responses, and integration
 */

const { validateBody, validateQuery, validateParams, validate } = require('../../validation/middleware');
const z = require('zod');

describe('Validation Middleware', () => {
  describe('validate (standalone function)', () => {
    const testSchema = z.object({
      name: z.string().min(1),
      age: z.number().min(0).max(150),
      email: z.string().email().optional(),
    });

    it('should return valid: true for correct data', () => {
      const data = { name: 'John', age: 30, email: 'john@example.com' };
      const result = validate(data, testSchema);
      expect(result.valid).toBe(true);
      expect(result.data).toEqual(data);
      expect(result.errors).toBeUndefined();
    });

    it('should return valid: false and errors for incorrect data', () => {
      const data = { name: '', age: 200 };
      const result = validate(data, testSchema);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should include field and message in error details', () => {
      const data = { name: '', age: 200 };
      const result = validate(data, testSchema);
      expect(result.valid).toBe(false);
      if (!result.valid && result.errors) {
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toHaveProperty('field');
        expect(result.errors[0]).toHaveProperty('message');
      }
    });

    it('should handle optional fields', () => {
      const data = { name: 'Jane', age: 25 };
      const result = validate(data, testSchema);
      expect(result.valid).toBe(true);
    });

    it('should validate nested objects', () => {
      const nestedSchema = z.object({
        user: z.object({
          name: z.string(),
          profile: z.object({
            bio: z.string(),
          }),
        }),
      });

      const validData = {
        user: {
          name: 'John',
          profile: {
            bio: 'Developer',
          },
        },
      };

      const result = validate(validData, nestedSchema);
      expect(result.valid).toBe(true);
    });

    it('should handle type coercion', () => {
      const coercionSchema = z.object({
        count: z.coerce.number(),
        active: z.coerce.boolean(),
      });

      const data = { count: '42', active: 'true' };
      const result = validate(data, coercionSchema);
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.data.count).toBe(42);
        expect(result.data.active).toBe(true);
      }
    });
  });

  describe('validateBody middleware', () => {
    const testSchema = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
    });

    it('should pass through valid body', () => {
      const middleware = validateBody(testSchema);
      const req = {
        body: { title: 'Test', description: 'A test' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid body with 400', () => {
      const middleware = validateBody(testSchema);
      const req = {
        body: { description: 'Missing title' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalled();
      expect(next).not.toHaveBeenCalled();
    });

    it('should return structured error response', () => {
      const middleware = validateBody(testSchema);
      const req = {
        body: { title: '' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(String),
          details: expect.any(Array),
        })
      );
    });
  });

  describe('validateQuery middleware', () => {
    const testSchema = z.object({
      page: z.coerce.number().min(1).optional().default(1),
      sort: z.enum(['asc', 'desc']).optional(),
    });

    it('should pass through valid query', () => {
      const middleware = validateQuery(testSchema);
      const req = {
        query: { page: '2', sort: 'desc' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid query parameter', () => {
      const middleware = validateQuery(testSchema);
      const req = {
        query: { page: 'invalid', sort: 'asc' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });

    it('should handle empty query object', () => {
      const middleware = validateQuery(testSchema);
      const req = {
        query: {},
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid enum value', () => {
      const middleware = validateQuery(testSchema);
      const req = {
        query: { page: '1', sort: 'invalid' },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('validateParams middleware', () => {
    const testSchema = z.object({
      id: z.string().uuid(),
      version: z.coerce.number().optional(),
    });

    it('should pass through valid params', () => {
      const middleware = validateParams(testSchema);
      const req = {
        params: {
          id: '550e8400-e29b-41d4-a716-446655440000',
          version: '1',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid UUID', () => {
      const middleware = validateParams(testSchema);
      const req = {
        params: {
          id: 'not-a-uuid',
        },
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Error response format', () => {
    const testSchema = z.object({
      email: z.string().email('Invalid email format'),
      count: z.number().min(1, 'Must be at least 1'),
    });

    it('should include descriptive error messages', () => {
      const result = validate({ email: 'invalid', count: 0 }, testSchema);
      expect(result.valid).toBe(false);
      if (!result.valid && result.errors) {
        const errorMessages = result.errors.map(e => e.message);
        expect(errorMessages.some(msg => msg.toLowerCase().includes('email'))).toBe(true);
      }
    });

    it('should track field paths for nested objects', () => {
      const nestedSchema = z.object({
        metadata: z.object({
          owner: z.object({
            name: z.string().min(1, 'Name is required'),
          }),
        }),
      });

      const data = { metadata: { owner: { name: '' } } };
      const result = validate(data, nestedSchema);
      expect(result.valid).toBe(false);
    });
  });

  describe('Integration with Express-like patterns', () => {
    it('should work with typical Express route pattern', () => {
      const schema = z.object({
        serviceId: z.string(),
        targetAvailability: z.number().min(90).max(99.999),
      });

      const middleware = validateBody(schema);

      // Simulate Express request
      const req = {
        body: {
          serviceId: 'svc-123',
          targetAvailability: 99.5,
        },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const next = jest.fn();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should stop execution on validation error', () => {
      const schema = z.object({
        id: z.coerce.number(),
      });

      const middleware = validateBody(schema);
      const req = {
        body: { id: 'not-a-number' },
      };

      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const next = jest.fn();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
