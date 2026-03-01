/**
 * Kubernetes Validation Tests
 * 
 * Tests for Zod schemas validating Kubernetes endpoint inputs
 */

const {
  podQuerySchema,
  deploymentQuerySchema,
  eventsQuerySchema,
  watchPodsSchema,
  namespaceQuerySchema,
} = require('../../validation/kubernetes.validation');

describe('Kubernetes Validation Schemas', () => {
  describe('podQuerySchema', () => {
    it('should validate with namespace parameter', () => {
      const valid = { namespace: 'default' };
      const result = podQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should apply default namespace when missing', () => {
      const valid = {};
      const result = podQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.namespace).toBe('default');
      }
    });

    it('should validate custom namespace', () => {
      const valid = { namespace: 'my-custom-namespace' };
      const result = podQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate kube-system namespace', () => {
      const valid = { namespace: 'kube-system' };
      const result = podQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should validate kube-public namespace', () => {
      const valid = { namespace: 'kube-public' };
      const result = podQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject non-string namespace', () => {
      const invalid = { namespace: 123 };
      const result = podQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty namespace string', () => {
      const invalid = { namespace: '' };
      const result = podQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('deploymentQuerySchema', () => {
    it('should validate with namespace parameter', () => {
      const valid = { namespace: 'default' };
      const result = deploymentQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should apply default namespace when missing', () => {
      const valid = {};
      const result = deploymentQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.namespace).toBe('default');
      }
    });

    it('should validate custom namespace', () => {
      const valid = { namespace: 'production' };
      const result = deploymentQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject empty namespace', () => {
      const invalid = { namespace: '' };
      const result = deploymentQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('eventsQuerySchema', () => {
    it('should validate with namespace parameter', () => {
      const valid = { namespace: 'default' };
      const result = eventsQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should apply default namespace when missing', () => {
      const valid = {};
      const result = eventsQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.namespace).toBe('default');
      }
    });

    it('should validate custom namespace', () => {
      const valid = { namespace: 'monitoring' };
      const result = eventsQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject non-string namespace', () => {
      const invalid = { namespace: null };
      const result = eventsQuerySchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('watchPodsSchema', () => {
    it('should validate with namespace in body', () => {
      const valid = { namespace: 'default' };
      const result = watchPodsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should apply default namespace when missing', () => {
      const valid = {};
      const result = watchPodsSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.namespace).toBe('default');
      }
    });

    it('should validate custom namespace', () => {
      const valid = { namespace: 'staging' };
      const result = watchPodsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should reject non-string namespace', () => {
      const invalid = { namespace: ['default'] };
      const result = watchPodsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should reject empty namespace', () => {
      const invalid = { namespace: '' };
      const result = watchPodsSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('should handle namespace with hyphens', () => {
      const valid = { namespace: 'my-namespace-123' };
      const result = watchPodsSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });
  });

  describe('namespaceQuerySchema', () => {
    it('should validate with namespace parameter', () => {
      const valid = { namespace: 'default' };
      const result = namespaceQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('should apply default namespace when missing', () => {
      const valid = {};
      const result = namespaceQuerySchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.namespace).toBe('default');
      }
    });

    it('should validate any valid Kubernetes namespace name', () => {
      const namespaces = [
        'default',
        'kube-system',
        'kube-public',
        'kube-node-lease',
        'my-app',
        'prod-backend',
        'test-123',
      ];
      
      namespaces.forEach(ns => {
        const valid = { namespace: ns };
        const result = namespaceQuerySchema.safeParse(valid);
        expect(result.success).toBe(true);
      });
    });
  });

  describe('Consistency across all query schemas', () => {
    it('should all default to "default" namespace when missing', () => {
      const schemas = [podQuerySchema, deploymentQuerySchema, eventsQuerySchema, watchPodsSchema, namespaceQuerySchema];
      
      schemas.forEach(schema => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.namespace).toBe('default');
        }
      });
    });

    it('should all accept empty object', () => {
      const schemas = [podQuerySchema, deploymentQuerySchema, eventsQuerySchema, watchPodsSchema, namespaceQuerySchema];
      
      schemas.forEach(schema => {
        const result = schema.safeParse({});
        expect(result.success).toBe(true);
      });
    });

    it('should all handle custom namespaces', () => {
      const schemas = [podQuerySchema, deploymentQuerySchema, eventsQuerySchema, watchPodsSchema, namespaceQuerySchema];
      const customNamespace = 'my-custom-app';
      
      schemas.forEach(schema => {
        const result = schema.safeParse({ namespace: customNamespace });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.namespace).toBe(customNamespace);
        }
      });
    });
  });
});
