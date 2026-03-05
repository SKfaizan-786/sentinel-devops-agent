/**
 * Secret Management Module
 * 
 * Provides a unified interface for secret retrieval with HashiCorp Vault integration.
 * Falls back to environment variables when Vault is unavailable (for backward compatibility
 * in development environments).
 * 
 * Flow:
 *   1. On startup, attempts to connect to Vault using configured credentials
 *   2. When fetchSecret() is called:
 *      a. If Vault is available → read from Vault KV store (with audit logging)
 *      b. If Vault is unavailable → fall back to process.env
 * 
 * Vault also handles:
 *   - Secret rotation (TTL-based)
 *   - Access audit trail
 *   - Dynamic DB credentials (future)
 */

const vault = require('node-vault');

// Cache for secrets to reduce Vault API calls
const secretCache = new Map();
// Cache TTL is configurable via environment variable (default: 2 minutes for better secret rotation responsiveness)
const DEFAULT_CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes
const SECRET_CACHE_TTL_MS = parseInt(process.env.SECRET_CACHE_TTL_MS || DEFAULT_CACHE_TTL_MS, 10);

// Vault client instance (lazily initialized)
let vaultClient = null;
let vaultAvailable = null; // null = not checked, true/false = checked

// Vault configuration from environment
const VAULT_ADDR = process.env.VAULT_ADDR || 'http://127.0.0.1:8200';
const VAULT_TOKEN = process.env.VAULT_TOKEN || '';
const VAULT_SECRET_PATH = process.env.VAULT_SECRET_PATH || 'secret/data/sentinel';
const VAULT_NAMESPACE = process.env.VAULT_NAMESPACE || '';

/**
 * Initialize the Vault client
 * @returns {object} - Vault client instance
 */
function initVaultClient() {
  if (vaultClient) {
    return vaultClient;
  }

  const options = {
    apiVersion: 'v1',
    endpoint: VAULT_ADDR,
    token: VAULT_TOKEN,
  };

  if (VAULT_NAMESPACE) {
    options.namespace = VAULT_NAMESPACE;
  }

  vaultClient = vault(options);
  return vaultClient;
}

/**
 * Check if Vault is available and accessible
 * @returns {Promise<boolean>} - True if Vault is available
 */
async function checkVaultAvailability() {
  if (vaultAvailable !== null) {
    return vaultAvailable;
  }

  if (!VAULT_TOKEN) {
    console.log('🔐 Vault: No VAULT_TOKEN configured, using environment variables');
    vaultAvailable = false;
    return false;
  }

  try {
    const client = initVaultClient();
    // Check Vault health status
    await client.health();
    console.log('🔐 Vault: Connected successfully to', VAULT_ADDR);
    vaultAvailable = true;
    return true;
  } catch (error) {
    console.log('🔐 Vault: Not available, falling back to environment variables');
    console.log(`   Reason: ${error.message}`);
    vaultAvailable = false;
    return false;
  }
}

/**
 * Fetch a secret from Vault KV store
 * @param {string} key - The secret key to fetch
 * @returns {Promise<string|null>} - The secret value or null if not found
 */
async function fetchFromVault(key) {
  try {
    const client = initVaultClient();
    const result = await client.read(VAULT_SECRET_PATH);
    
    if (result && result.data && result.data.data) {
      return result.data.data[key] || null;
    }
    
    return null;
  } catch (error) {
    console.error(`🔐 Vault: Error fetching secret '${key}':`, error.message);
    return null;
  }
}

/**
 * Fetch a secret by key name
 * 
 * Resolution chain:
 * 1. Check cache (if not expired)
 * 2. Try Vault (if available)
 * 3. Fall back to environment variable
 * 
 * @param {string} key - The secret key (e.g., 'JWT_SECRET', 'DB_PASSWORD', 'GROQ_API_KEY')
 * @param {object} options - Optional configuration
 * @param {boolean} options.required - If true, throws error when secret is not found
 * @param {string} options.defaultValue - Default value if secret is not found
 * @returns {Promise<string|null>} - The secret value
 */
async function fetchSecret(key, options = {}) {
  const { required = false, defaultValue = null } = options;

  // Check cache first
  const cached = secretCache.get(key);
  if (cached && Date.now() - cached.timestamp < SECRET_CACHE_TTL_MS) {
    return cached.value;
  }

  let secretValue = null;
  let source = 'none';

  // Try Vault first
  const isVaultAvailable = await checkVaultAvailability();
  
  if (isVaultAvailable) {
    secretValue = await fetchFromVault(key);
    if (secretValue !== null) {
      source = 'vault';
    }
  }

  // Fall back to environment variable
  if (secretValue === null) {
    secretValue = process.env[key] || null;
    if (secretValue !== null) {
      source = 'env';
    }
  }

  // Apply default value
  if (secretValue === null && defaultValue !== null) {
    secretValue = defaultValue;
    source = 'default';
  }

  // Check if required
  if (required && secretValue === null) {
    throw new Error(`Required secret '${key}' is not configured. Set it in Vault or as an environment variable.`);
  }

  // Update cache
  if (secretValue !== null) {
    secretCache.set(key, {
      value: secretValue,
      timestamp: Date.now(),
      source,
    });
  }

  return secretValue;
}

/**
 * Synchronous version that returns cached value or falls back to env
 * Use this when you can't use async/await (e.g., module initialization)
 * 
 * Note: This will NOT fetch from Vault if the cache is empty.
 * Call fetchSecret() first during app initialization to populate the cache.
 * 
 * @param {string} key - The secret key
 * @param {string} defaultValue - Default value if not found
 * @returns {string|null} - The secret value
 */
function getSecretSync(key, defaultValue = null) {
  // Check cache first
  const cached = secretCache.get(key);
  if (cached && Date.now() - cached.timestamp < SECRET_CACHE_TTL_MS) {
    return cached.value;
  }

  // Fall back to environment variable
  return process.env[key] || defaultValue;
}

/**
 * Pre-load all commonly used secrets into cache
 * Call this during application startup to ensure secrets are available
 * 
 * @param {string[]} keys - Array of secret keys to pre-load
 */
async function preloadSecrets(keys) {
  console.log('🔐 Pre-loading secrets...');
  
  const results = {};
  for (const key of keys) {
    try {
      const value = await fetchSecret(key);
      results[key] = value ? 'loaded' : 'not found';
    } catch (error) {
      results[key] = `error: ${error.message}`;
    }
  }
  
  console.log('🔐 Secrets pre-loaded:', results);
  return results;
}

/**
 * Clear the secret cache
 * Useful for testing or when secrets need to be refreshed
 */
function clearCache() {
  secretCache.clear();
  vaultAvailable = null;
}

/**
 * Get the current secret source for a key
 * @param {string} key - The secret key
 * @returns {string|null} - 'vault', 'env', 'default', or null if not cached
 */
function getSecretSource(key) {
  const cached = secretCache.get(key);
  return cached ? cached.source : null;
}

/**
 * Check if Vault integration is currently active
 * @returns {boolean} - True if connected to Vault
 */
function isVaultEnabled() {
  return vaultAvailable === true;
}

module.exports = {
  fetchSecret,
  getSecretSync,
  preloadSecrets,
  clearCache,
  getSecretSource,
  isVaultEnabled,
  checkVaultAvailability,
};
