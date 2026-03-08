const { Pool } = require('pg');

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'sentinel_rbac',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
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

/**
 * Gracefully close the database pool
 * @returns {Promise<void>}
 */
async function closePool() {
  try {
    if (pool) {
      console.log('🔄 Closing database pool...');
      await pool.end();
      console.log('✅ Database pool closed successfully');
    }
  } catch (error) {
    console.error('❌ Error closing database pool:', error);
  }
}

module.exports = { pool, closePool };
