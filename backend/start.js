/**
 * Application Entry Point
 *
 * Initializes secrets from Vault (or env fallback) before loading the main
 * application. This ensures modules that resolve secrets at require-time
 * (e.g., AuthService's JWT_SECRET, db/config's DB_PASSWORD) have access
 * to Vault-sourced values through the getSecretSync() cache.
 */

require('dotenv').config();

const { initializeSecrets } = require('./lib/secretsInit');

initializeSecrets()
  .then(() => {
    // Now safe to load modules that call getSecretSync() at module scope
    require('./index');
  })
  .catch((error) => {
    console.error('❌ Failed to initialize secrets:', error);
    process.exit(1);
  });
