#!/usr/bin/env node

/**
 * Test Suite Verification Checklist
 * Run this script to verify all test files were created correctly
 */

const fs = require('fs');
const path = require('path');

const backendPath = __dirname;

// Define all expected test files
const expectedFiles = [
  // Configuration
  'jest.config.js',
  
  // Test directories and files
  '__tests__/setup.js',
  '__tests__/README.md',
  '__tests__/advanced-integration.test.js',
  
  // Mocks
  '__tests__/mocks/auth.mock.js',
  '__tests__/mocks/slo.mock.js',
  '__tests__/mocks/docker.mock.js',
  '__tests__/mocks/kubernetes.mock.js',
  
  // Test utilities
  '__tests__/utils/testUtils.js',
  
  // Route integration tests
  '__tests__/routes/slo.routes.test.js',
  '__tests__/routes/security.routes.test.js',
  '__tests__/routes/kubernetes.routes.test.js',
  
  // Unit tests
  '__tests__/unit/slo-calculator.test.js',
  '__tests__/unit/slo-tracker.test.js',
  
  // Documentation
  'TESTING.md',
  'README.md',
  'setup-tests.sh',
  'setup-tests.bat',
];

console.log('\n📋 Test Suite Verification Checklist\n');
console.log('========================================\n');

let allValid = true;
let filesCreated = 0;

expectedFiles.forEach((file) => {
  const filePath = path.join(backendPath, file);
  const exists = fs.existsSync(filePath);
  const status = exists ? '✅' : '❌';
  
  console.log(`${status} ${file}`);
  
  if (exists) {
    filesCreated++;
    // Check file size
    const stats = fs.statSync(filePath);
    if (stats.size > 0) {
      console.log(`   └─ ${stats.size} bytes\n`);
    } else {
      console.log(`   └─ ⚠️  Empty file\n`);
      allValid = false;
    }
  } else {
    allValid = false;
  }
});

console.log('========================================\n');

// Summary
console.log(`📊 Summary:\n`);
console.log(`   Total Files Expected: ${expectedFiles.length}`);
console.log(`   Files Created: ${filesCreated}`);
console.log(`   Missing: ${expectedFiles.length - filesCreated}\n`);

if (allValid && filesCreated === expectedFiles.length) {
  console.log('✅ All test files created successfully!\n');
  console.log('Next steps:');
  console.log('   1. npm install');
  console.log('   2. npm test\n');
} else {
  console.log('❌ Some files are missing or empty\n');
  console.log('Please review the output above.\n');
}

// Check package.json for test scripts
console.log('========================================\n');
console.log('📦 Checking package.json...\n');

try {
  const packagePath = path.join(backendPath, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  
  const testScripts = [
    'test',
    'test:watch',
    'test:coverage',
    'test:unit',
    'test:integration',
  ];
  
  const devDependencies = [
    'jest',
    'supertest',
    'jest-mock-extended',
  ];
  
  console.log('Test Scripts:');
  testScripts.forEach((script) => {
    const has = packageJson.scripts && packageJson.scripts[script];
    const status = has ? '✅' : '❌';
    console.log(`   ${status} npm run ${script}`);
  });
  
  console.log('\nDev Dependencies:');
  devDependencies.forEach((dep) => {
    const has = packageJson.devDependencies && packageJson.devDependencies[dep];
    const status = has ? '✅' : '❌';
    const version = has ? packageJson.devDependencies[dep] : 'missing';
    console.log(`   ${status} ${dep} (${version})`);
  });
} catch (err) {
  console.log(`❌ Error reading package.json: ${err.message}\n`);
}

console.log('\n========================================\n');
console.log('✨ Verification complete!\n');
