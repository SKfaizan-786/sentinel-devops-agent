const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('./config');

async function runMigrations() {
  console.log('🔄 Running database migrations...');
  
  try {
    // Read migration files
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of migrationFiles) {
      console.log(`  📄 Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`  ✅ Completed: ${file}`);
    }
    
    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

async function runSeeds() {
  console.log('🌱 Running database seeds...');
  
  try {
    // Read seed files
    const seedsDir = path.join(__dirname, 'seeds');
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();
    
    for (const file of seedFiles) {
      console.log(`  📄 Running seed: ${file}`);
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      await pool.query(sql);
      console.log(`  ✅ Completed: ${file}`);
    }
    
    console.log('✅ All seeds completed successfully');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    throw error;
  }
}

async function main() {
  try {
    await runMigrations();
    await runSeeds();
    console.log('\n🎉 Database setup complete!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Database setup failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { runMigrations, runSeeds };
