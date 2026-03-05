/**
 * Secrets Module Unit Tests
 * 
 * Tests for the secret management module with Vault integration
 * and environment variable fallback.
 * 
 * Note: Vault integration tests that require actual Vault connectivity
 * are tested via integration tests. This suite focuses on the fallback
 * behavior and caching mechanism.
 */

// Store original env
const originalEnv = { ...process.env };

describe('Secrets Module - Unit Tests', () => {
  let secrets;

  beforeEach(() => {
    // Clear module cache to get fresh module state
    jest.resetModules();
    
    // Reset environment variables
    process.env = { ...originalEnv };
    delete process.env.VAULT_ADDR;
    delete process.env.VAULT_TOKEN;
    delete process.env.VAULT_SECRET_PATH;
    delete process.env.VAULT_NAMESPACE;
    delete process.env.TEST_SECRET;
    
    // Re-require the module to get fresh state
    secrets = require('../../lib/secrets');
    secrets.clearCache();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  describe('fetchSecret() - Environment Variable Fallback', () => {
    it('should return env variable when Vault is not configured', async () => {
      process.env.TEST_SECRET = 'env-value';
      
      const value = await secrets.fetchSecret('TEST_SECRET');
      
      expect(value).toBe('env-value');
    });

    it('should return default value when secret is not found', async () => {
      const value = await secrets.fetchSecret('NONEXISTENT_SECRET_XYZ', { defaultValue: 'default-val' });
      
      expect(value).toBe('default-val');
    });

    it('should throw error when required secret is missing', async () => {
      await expect(secrets.fetchSecret('REQUIRED_SECRET_ABC', { required: true }))
        .rejects.toThrow("Required secret 'REQUIRED_SECRET_ABC' is not configured");
    });

    it('should return null when secret is not found and no default', async () => {
      const value = await secrets.fetchSecret('NONEXISTENT_SECRET_XYZ');
      
      expect(value).toBeNull();
    });

    it('should use cached value within TTL', async () => {
      process.env.TEST_SECRET = 'first-value';
      
      // First call
      const value1 = await secrets.fetchSecret('TEST_SECRET');
      expect(value1).toBe('first-value');
      
      // Change env var
      process.env.TEST_SECRET = 'second-value';
      
      // Second call should return cached value
      const value2 = await secrets.fetchSecret('TEST_SECRET');
      expect(value2).toBe('first-value');
    });

    it('should fall back to env when Vault is not reachable', async () => {
      process.env.VAULT_TOKEN = 'invalid-token';
      process.env.JWT_TEST = 'env-jwt-secret';
      
      // Clear cache to reset vault availability check
      secrets.clearCache();
      
      const value = await secrets.fetchSecret('JWT_TEST');
      
      expect(value).toBe('env-jwt-secret');
      expect(secrets.getSecretSource('JWT_TEST')).toBe('env');
    });
  });

  describe('getSecretSync()', () => {
    it('should return env variable when cache is empty', () => {
      process.env.TEST_SYNC_SECRET = 'sync-env-value';
      
      const value = secrets.getSecretSync('TEST_SYNC_SECRET');
      
      expect(value).toBe('sync-env-value');
    });

    it('should return default value when not found', () => {
      const value = secrets.getSecretSync('NONEXISTENT_SYNC', 'sync-default');
      
      expect(value).toBe('sync-default');
    });

    it('should return null when not found and no default', () => {
      const value = secrets.getSecretSync('NONEXISTENT_SYNC_NULL');
      
      expect(value).toBeNull();
    });

    it('should return cached value when available', async () => {
      process.env.CACHED_TEST_SECRET = 'cached-value';
      
      // Populate cache via async function
      await secrets.fetchSecret('CACHED_TEST_SECRET');
      
      // Change env var
      process.env.CACHED_TEST_SECRET = 'new-value';
      
      // Sync function should return cached value
      const value = secrets.getSecretSync('CACHED_TEST_SECRET');
      expect(value).toBe('cached-value');
    });
  });

  describe('preloadSecrets()', () => {
    it('should load multiple secrets into cache', async () => {
      process.env.SECRET_A = 'value-a';
      process.env.SECRET_B = 'value-b';
      
      const results = await secrets.preloadSecrets(['SECRET_A', 'SECRET_B', 'SECRET_C_MISSING']);
      
      expect(results.SECRET_A).toBe('loaded');
      expect(results.SECRET_B).toBe('loaded');
      expect(results.SECRET_C_MISSING).toBe('not found');
      
      // Verify cache is populated
      expect(secrets.getSecretSync('SECRET_A')).toBe('value-a');
      expect(secrets.getSecretSync('SECRET_B')).toBe('value-b');
    });
  });

  describe('clearCache()', () => {
    it('should clear all cached secrets', async () => {
      process.env.CLEAR_TEST = 'original';
      
      // Populate cache
      await secrets.fetchSecret('CLEAR_TEST');
      expect(secrets.getSecretSync('CLEAR_TEST')).toBe('original');
      
      // Change env var
      process.env.CLEAR_TEST = 'updated';
      
      // Clear cache
      secrets.clearCache();
      
      // Now should get updated value
      const value = await secrets.fetchSecret('CLEAR_TEST');
      expect(value).toBe('updated');
    });
  });

  describe('getSecretSource()', () => {
    it('should return null for uncached secrets', () => {
      expect(secrets.getSecretSource('NONEXISTENT_SOURCE')).toBeNull();
    });

    it('should return "env" for env-sourced secrets', async () => {
      process.env.SOURCE_TEST = 'env-value';
      
      await secrets.fetchSecret('SOURCE_TEST');
      
      expect(secrets.getSecretSource('SOURCE_TEST')).toBe('env');
    });

    it('should return "default" for default-sourced secrets', async () => {
      await secrets.fetchSecret('NONEXISTENT_DEFAULT', { defaultValue: 'default-val' });
      
      expect(secrets.getSecretSource('NONEXISTENT_DEFAULT')).toBe('default');
    });
  });

  describe('isVaultEnabled()', () => {
    it('should return false when Vault is not configured', async () => {
      // No VAULT_TOKEN set
      delete process.env.VAULT_TOKEN;
      
      await secrets.checkVaultAvailability();
      
      expect(secrets.isVaultEnabled()).toBe(false);
    });

    it('should return false when Vault is not reachable', async () => {
      process.env.VAULT_TOKEN = 'test-token';
      // Vault is not running, so it should return false
      
      // Clear cache to reset vault availability check
      secrets.clearCache();
      
      await secrets.checkVaultAvailability();
      
      // Without a running Vault, this should be false
      expect(secrets.isVaultEnabled()).toBe(false);
    });
  });
});
