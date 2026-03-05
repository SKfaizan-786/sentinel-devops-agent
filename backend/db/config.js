const { Pool } = require('pg');
const { getSecretSync } = require('../lib/secrets');

// Database configuration using secrets module (with env fallback)
const pool = new Pool({
  host: getSecretSync('DB_HOST', 'localhost'),
  port: getSecretSync('DB_PORT', '5432'),
  database: getSecretSync('DB_NAME', 'sentinel_rbac'),
  user: getSecretSync('DB_USER', 'postgres'),
  password: getSecretSync('DB_PASSWORD', 'postgres'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection
pool.on('connect', () => {
  console.log('✅ Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
  process.exit(-1);
});

module.exports = pool;
