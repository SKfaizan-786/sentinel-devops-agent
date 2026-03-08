const fs = require('fs');

/**
 * Configuration Validator for Sentinel Backend
 * Validates all required environment variables at startup and provides
 * helpful error messages with fix suggestions.
 */

const REQUIRED_VARS = [
    // Database Configuration
    { name: 'DB_HOST', type: 'string', default: '127.0.0.1', description: 'PostgreSQL host address' },
    { name: 'DB_PORT', type: 'port', default: '5432', description: 'PostgreSQL port' },
    { name: 'DB_NAME', type: 'string', default: 'sentinel_rbac', description: 'PostgreSQL database name' },
    { name: 'DB_USER', type: 'string', default: 'kestra', description: 'PostgreSQL username' },
    { name: 'DB_PASSWORD', type: 'string', default: 'kestra', description: 'PostgreSQL password' },

    // JWT Configuration
    { name: 'JWT_SECRET', type: 'string', default: null, description: 'JWT signing secret (REQUIRED in production)' },
    { name: 'JWT_ACCESS_EXPIRY', type: 'string', default: '15m', description: 'JWT access token expiry duration' },
    { name: 'JWT_REFRESH_EXPIRY', type: 'string', default: '7d', description: 'JWT refresh token expiry duration' },

    // Server Configuration
    { name: 'PORT', type: 'port', default: '4000', description: 'Server listening port' },
    { name: 'NODE_ENV', type: 'enum', values: ['development', 'production', 'test'], default: 'development', description: 'Node environment' },

    // Docker Configuration 
    { name: 'DOCKER_HOST', type: 'string', default: '/var/run/docker.sock', description: 'Docker socket path or TCP address' },

    // External Service Endpoints
    { name: 'LLAMA_ENDPOINT', type: 'url', default: 'http://localhost:11434', description: 'LLaMA AI model endpoint' },
    { name: 'KESTRA_ENDPOINT', type: 'url', default: 'http://localhost:8080', description: 'Kestra workflow engine endpoint' },

    // Slack Integration (optional)
    { name: 'SLACK_SIGNING_SECRET', type: 'string', default: null, required: false, description: 'Slack app signing secret' },
    { name: 'SLACK_BOT_TOKEN', type: 'string', default: null, required: false, description: 'Slack bot OAuth token' },
];

/**
 * Check if a string is a valid URL
 */
function isValidUrl(value) {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Check if a value is a valid port number (1-65535)
 */
function isValidPort(value) {
    const port = Number(value);
    return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * Get a fix suggestion for a given variable and error type
 */
function getSuggestion(varConfig, value) {
    switch (varConfig.type) {
        case 'url':
            return `Set ${varConfig.name}=http://localhost:<port> in your .env file`;
        case 'port':
            return `Set ${varConfig.name} to a number between 1 and 65535 in your .env file`;
        case 'path':
            return `Ensure the path "${value}" exists, or update ${varConfig.name} in your .env file`;
        case 'enum':
            return `Set ${varConfig.name} to one of: ${varConfig.values.join(', ')}`;
        case 'boolean':
            return `Set ${varConfig.name} to true or false in your .env file`;
        default:
            return `Set ${varConfig.name}=<value> in your .env file`;
    }
}

/**
 * Validate a single configuration variable
 * Returns null if valid, or an error object { message, suggestion } if invalid
 */
function validateVar(varConfig) {
    const value = process.env[varConfig.name] || varConfig.default;
    const isRequired = varConfig.required !== false; // Default to required

    // Check if value is missing
    if (!value && isRequired) {
        return {
            name: varConfig.name,
            message: `${varConfig.name} is not set and has no default value`,
            suggestion: getSuggestion(varConfig, value),
            severity: 'error',
        };
    }

    // Skip further validation if value is missing but optional
    if (!value && !isRequired) {
        return null;
    }

    // Type-specific validation
    switch (varConfig.type) {
        case 'url':
            if (!isValidUrl(value)) {
                return {
                    name: varConfig.name,
                    message: `${varConfig.name} is not a valid URL: "${value}"`,
                    suggestion: getSuggestion(varConfig, value),
                    severity: 'error',
                };
            }
            break;

        case 'port':
            if (!isValidPort(value)) {
                return {
                    name: varConfig.name,
                    message: `${varConfig.name} is not a valid port number: "${value}"`,
                    suggestion: getSuggestion(varConfig, value),
                    severity: 'error',
                };
            }
            break;

        case 'path':
            if (!fs.existsSync(value)) {
                return {
                    name: varConfig.name,
                    message: `${varConfig.name} path does not exist: "${value}"`,
                    suggestion: getSuggestion(varConfig, value),
                    severity: 'warning',
                };
            }
            break;

        case 'enum':
            if (varConfig.values && !varConfig.values.includes(value)) {
                return {
                    name: varConfig.name,
                    message: `${varConfig.name} has invalid value: "${value}"`,
                    suggestion: getSuggestion(varConfig, value),
                    severity: 'error',
                };
            }
            break;

        case 'boolean':
            if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
                return {
                    name: varConfig.name,
                    message: `${varConfig.name} is not a valid boolean: "${value}"`,
                    suggestion: getSuggestion(varConfig, value),
                    severity: 'error',
                };
            }
            break;
    }

    // Security warnings
    if (varConfig.name === 'JWT_SECRET' && process.env.NODE_ENV === 'production') {
        if (value.includes('change-this') || value.length < 32) {
            return {
                name: varConfig.name,
                message: `${varConfig.name} appears to be a default/weak value in production`,
                suggestion: `Generate a strong secret: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
                severity: 'warning',
            };
        }
    }

    return null;
}

/**
 * Validate all configuration variables
 * @param {object} options - { exitOnError: boolean, silent: boolean }
 * @returns {{ errors: Array, warnings: Array, valid: Array }}
 */
function validateConfig(options = {}) {
    const { exitOnError = false, silent = false } = options;
    const errors = [];
    const warnings = [];
    const valid = [];

    for (const varConfig of REQUIRED_VARS) {
        const result = validateVar(varConfig);
        if (result) {
            if (result.severity === 'error') {
                errors.push(result);
            } else {
                warnings.push(result);
            }
        } else {
            valid.push({
                name: varConfig.name,
                value: process.env[varConfig.name] || varConfig.default || '(not set — optional)',
                description: varConfig.description,
            });
        }
    }

    if (!silent) {
        printResults(errors, warnings, valid);
    }

    if (exitOnError && errors.length > 0) {
        console.error('\n💀 Sentinel cannot start with invalid configuration. Fix the errors above and try again.\n');
        process.exit(1);
    }

    return { errors, warnings, valid };
}

/**
 * Print validation results to the console
 */
function printResults(errors, warnings, valid) {
    console.log('\n🔍 Sentinel Configuration Validator');
    console.log('═'.repeat(50));

    if (errors.length > 0) {
        console.log(`\n❌ ${errors.length} Error(s):`);
        for (const err of errors) {
            console.log(`   ✖ ${err.message}`);
            console.log(`     💡 Fix: ${err.suggestion}`);
        }
    }

    if (warnings.length > 0) {
        console.log(`\n⚠️  ${warnings.length} Warning(s):`);
        for (const warn of warnings) {
            console.log(`   ⚠ ${warn.message}`);
            console.log(`     💡 Fix: ${warn.suggestion}`);
        }
    }

    if (errors.length === 0 && warnings.length === 0) {
        console.log('\n✅ All configuration variables are valid!');
    }

    console.log(`\n📊 Summary: ${valid.length} valid, ${warnings.length} warnings, ${errors.length} errors`);
    console.log('═'.repeat(50));
}

module.exports = { validateConfig, REQUIRED_VARS };
