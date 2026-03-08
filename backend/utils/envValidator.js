/**
 * Environment Variable Validation Utility
 * 
 * This utility validates that critical environment variables are properly configured
 * with secure values in production environments.
 * 
 * Purpose:
 * - Prevent application startup with weak or placeholder secrets
 * - Enforce secure credential configuration in production
 * - Provide clear error messages for configuration issues
 */

/**
 * Validates that critical environment variables are secure in production
 * @throws {Error} If any critical variable is missing or contains forbidden values
 */
function validateEnvSecrets() {
  // Only validate in production environments
  if (process.env.NODE_ENV !== 'production') {
    return; // Skip validation in development/testing
  }

  // Forbidden values that indicate weak or placeholder secrets
  const forbiddenValues = [
    'GENERATE_STRONG_SECRET_HERE',
    'SET_SECURE_PASSWORD_HERE',
    'SET_SECURE_USER_HERE',
    'SET_SECURE_DB_NAME_HERE',
    'your-super-secret-jwt-key-change-this-in-production',
    'postgres',           // Default PostgreSQL password
    'kestra',             // Default Kestra credentials
    'password123',         // Weak default password
    'admin',              // Common default username
    'root',               // Common default username
    '',                   // Empty values
    null,                 // Null values
    undefined              // Undefined values
  ];

  // Critical environment variables that must be secure
  const criticalVariables = [
    'JWT_SECRET',
    'DB_PASSWORD',
    'POSTGRES_PASSWORD',
    'POSTGRES_USER',
    'POSTGRES_DB'
  ];

  const issues = [];

  // Check each critical variable
  criticalVariables.forEach(varName => {
    const value = process.env[varName];

    // Check if variable is missing
    if (!value && value !== '') {
      issues.push(`Missing required environment variable: ${varName}`);
      return;
    }

    // Check if variable contains forbidden values
    if (forbiddenValues.includes(value)) {
      issues.push(
        `Insecure value detected for ${varName}: "${value}". ` +
        `This appears to be a placeholder or default value. ` +
        `Please set a secure, unique value before deploying to production.`
      );
    }

    // Additional checks for specific variables
    if (varName === 'JWT_SECRET' && value.length < 32) {
      issues.push(
        `JWT_SECRET is too short (${value.length} characters). ` +
        `Please use at least 32 characters for production security.`
      );
    }

    if (varName.includes('PASSWORD') && value.length < 8) {
      issues.push(
        `${varName} is too short (${value.length} characters). ` +
        `Please use at least 8 characters for production security.`
      );
    }
  });

  // If any issues found, throw comprehensive error
  if (issues.length > 0) {
    const errorMessage = [
      '🚨 SECURITY VALIDATION FAILED 🚨',
      '',
      'Application cannot start in production with insecure configuration:',
      ...issues.map(issue => `  ❌ ${issue}`),
      '',
      'To fix this issue:',
      '  1. Generate strong, unique secrets for your environment',
      '  2. Update your .env file with secure values',
      '  3. Ensure no placeholder or default values are used',
      '',
      'For help generating secure secrets:',
      '  JWT: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
      '  DB: Use a password manager to generate strong passwords',
      '',
      'Learn more about secure configuration in our documentation.'
    ].join('\n');

    throw new Error(errorMessage);
  }

  // If we get here, all validations passed
  console.log('✅ Environment security validation passed');
}

/**
 * Validates a single environment variable
 * @param {string} varName - Environment variable name
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
function validateSingleVariable(varName, options = {}) {
  const {
    minLength = 8,
    allowEmpty = false,
    customValidator = null
  } = options;

  const value = process.env[varName];
  
  const result = {
    isValid: true,
    issues: []
  };

  // Check if variable is missing
  if (!value && value !== '' && !allowEmpty) {
    result.isValid = false;
    result.issues.push(`Missing required environment variable: ${varName}`);
    return result;
  }

  // Check minimum length
  if (value && value.length < minLength) {
    result.isValid = false;
    result.issues.push(`${varName} is too short (${value.length} characters, minimum ${minLength})`);
  }

  // Custom validator
  if (customValidator && typeof customValidator === 'function') {
    const customResult = customValidator(value);
    if (!customResult.isValid) {
      result.isValid = false;
      result.issues.push(...customResult.issues);
    }
  }

  return result;
}

/**
 * Quick validation for development (less strict)
 * @returns {Object} Validation result with warnings
 */
function validateForDevelopment() {
  const warnings = [];
  const criticalVariables = ['JWT_SECRET', 'DB_PASSWORD'];

  criticalVariables.forEach(varName => {
    const value = process.env[varName];
    const forbiddenValues = [
      'your-super-secret-jwt-key-change-this-in-production',
      'GENERATE_STRONG_SECRET_HERE',
      'SET_SECURE_PASSWORD_HERE'
    ];

    if (forbiddenValues.includes(value)) {
      warnings.push(
        `⚠️  Development warning: ${varName} contains a placeholder value. ` +
        `Consider setting a proper value for realistic testing.`
      );
    }
  });

  if (warnings.length > 0) {
    console.warn('\n' + warnings.join('\n') + '\n');
  }

  return { hasWarnings: warnings.length > 0, warnings };
}

module.exports = {
  validateEnvSecrets,
  validateSingleVariable,
  validateForDevelopment
};
