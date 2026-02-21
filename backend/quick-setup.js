// Load environment variables
require('dotenv').config();

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logStep(step, message) {
  log(`\n${'='.repeat(60)}`, 'blue');
  log(`Step ${step}: ${message}`, 'blue');
  log('='.repeat(60), 'blue');
}

async function quickSetup() {
  log('\n🚀 Sentinel RBAC Quick Setup\n', 'blue');
  log('This script will set up the RBAC system automatically.\n', 'cyan');
  
  try {
    // Step 1: Check Node.js version
    logStep(1, 'Checking Node.js version');
    const nodeVersion = process.version;
    logInfo(`Node.js version: ${nodeVersion}`);
    
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));
    if (majorVersion < 16) {
      logError('Node.js 16 or higher is required');
      process.exit(1);
    }
    logSuccess('Node.js version is compatible');
    
    // Step 2: Check if .env exists
    logStep(2, 'Checking environment configuration');
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) {
      logWarning('.env file not found, creating from .env.example');
      fs.copyFileSync(
        path.join(__dirname, '.env.example'),
        envPath
      );
      logSuccess('.env file created');
    } else {
      logSuccess('.env file exists');
    }
    
    // Step 3: Check PostgreSQL connection
    logStep(3, 'Checking PostgreSQL connection');
    const pool = require('./db/config');
    
    try {
      await pool.query('SELECT 1');
      logSuccess('PostgreSQL connection successful');
    } catch (error) {
      logError('Cannot connect to PostgreSQL');
      logError(`Error: ${error.message}`);
      logInfo('\nPlease check:');
      logInfo('  1. PostgreSQL is running');
      logInfo('  2. Database credentials in .env are correct');
      logInfo('  3. Database "sentinel_rbac" exists');
      logInfo('\nTo create the database, run:');
      logInfo('  createdb sentinel_rbac');
      process.exit(1);
    }
    
    // Step 4: Run migrations
    logStep(4, 'Running database migrations');
    try {
      const { runMigrations, runSeeds } = require('./db/migrate');
      await runMigrations();
      await runSeeds();
      logSuccess('Database setup complete');
    } catch (error) {
      logError('Migration failed');
      logError(`Error: ${error.message}`);
      process.exit(1);
    }
    
    // Step 5: Create admin user
    logStep(5, 'Creating admin user');
    try {
      const AuthService = require('./auth/AuthService');
      
      // Check if admin exists
      const existingUser = await pool.query(
        `SELECT id FROM users WHERE email = $1`,
        ['admin@example.com']
      );
      
      if (existingUser.rows.length > 0) {
        logWarning('Admin user already exists');
        logInfo('Email: admin@example.com');
        logInfo('Password: password123');
      } else {
        // Create admin user
        const passwordHash = await AuthService.hashPassword('password123');
        const userResult = await pool.query(
          `INSERT INTO users (email, password_hash, organization_id)
           VALUES ($1, $2, $3)
           RETURNING id`,
          ['admin@example.com', passwordHash, '00000000-0000-0000-0000-000000000001']
        );
        
        // Assign Admin role
        const roleResult = await pool.query(
          `SELECT id FROM roles WHERE name = 'Admin' AND organization_id = '00000000-0000-0000-0000-000000000001'`
        );
        
        await pool.query(
          `INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`,
          [userResult.rows[0].id, roleResult.rows[0].id]
        );
        
        logSuccess('Admin user created');
        logInfo('Email: admin@example.com');
        logInfo('Password: password123');
      }
    } catch (error) {
      logError('Failed to create admin user');
      logError(`Error: ${error.message}`);
      process.exit(1);
    }
    
    // Summary
    log('\n' + '='.repeat(60), 'green');
    log('🎉 Setup Complete!', 'green');
    log('='.repeat(60) + '\n', 'green');
    
    logInfo('Your RBAC system is ready to use!\n');
    
    log('📝 Admin Credentials (DEVELOPMENT ONLY):', 'cyan');
    logInfo('  Email: admin@example.com');
    logInfo('  Password: password123');
    log('\n⚠️  SECURITY WARNING:', 'red');
    logWarning('  These are DEFAULT CREDENTIALS for development only!');
    logWarning('  NEVER use these credentials in production!');
    logWarning('  Change the password immediately after first login!');
    logWarning('  Use POST /auth/password-reset-request to reset.\n');
    
    log('🚀 Next Steps:', 'cyan');
    logInfo('  1. Start the server:');
    logInfo('     npm start\n');
    logInfo('  2. In a new terminal, run tests:');
    logInfo('     npm run test-rbac\n');
    logInfo('  3. Or test manually:');
    logInfo('     curl -X POST http://localhost:4000/auth/login \\');
    logInfo('       -H "Content-Type: application/json" \\');
    logInfo('       -d \'{"email":"admin@example.com","password":"password123"}\'');
    
    log('\n📚 Documentation:', 'cyan');
    logInfo('  - Setup Guide: backend/RBAC_SETUP.md');
    logInfo('  - Testing Guide: backend/TESTING_GUIDE.md');
    
    process.exit(0);
    
  } catch (error) {
    logError(`\nSetup failed: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

quickSetup();
