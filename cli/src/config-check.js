import chalk from 'chalk';
import Table from 'cli-table3';
import dotenv from 'dotenv';
import path from 'path';

// Try to load .env from current dir or from backend dir if running from root/cli
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../backend/.env') });

/**
 * Configuration variables to validate (mirrors backend/config/validator.js)
 */
const REQUIRED_VARS = [
    { name: 'DB_HOST', type: 'string', default: '127.0.0.1', description: 'PostgreSQL host address' },
    { name: 'DB_PORT', type: 'port', default: '5432', description: 'PostgreSQL port' },
    { name: 'DB_NAME', type: 'string', default: 'sentinel_rbac', description: 'PostgreSQL database name' },
    { name: 'DB_USER', type: 'string', default: 'kestra', description: 'PostgreSQL username' },
    { name: 'DB_PASSWORD', type: 'string', default: 'kestra', description: 'PostgreSQL password' },
    { name: 'JWT_SECRET', type: 'string', default: null, description: 'JWT signing secret' },
    { name: 'JWT_ACCESS_EXPIRY', type: 'string', default: '15m', description: 'JWT access token expiry' },
    { name: 'JWT_REFRESH_EXPIRY', type: 'string', default: '7d', description: 'JWT refresh token expiry' },
    { name: 'PORT', type: 'port', default: '4000', description: 'Server listening port' },
    { name: 'NODE_ENV', type: 'enum', values: ['development', 'production', 'test'], default: 'development', description: 'Node environment' },
    { name: 'DOCKER_HOST', type: 'string', default: '/var/run/docker.sock', description: 'Docker socket path' },
    { name: 'LLAMA_ENDPOINT', type: 'url', default: 'http://localhost:11434', description: 'LLaMA AI endpoint' },
    { name: 'KESTRA_ENDPOINT', type: 'url', default: 'http://localhost:8080', description: 'Kestra workflow endpoint' },
    { name: 'SLACK_SIGNING_SECRET', type: 'string', default: null, required: false, description: 'Slack signing secret' },
    { name: 'SLACK_BOT_TOKEN', type: 'string', default: null, required: false, description: 'Slack bot token' },
];

function isValidUrl(value) {
    try { new URL(value); return true; } catch { return false; }
}

function isValidPort(value) {
    const port = Number(value);
    return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * CLI command: sentinel config:validate
 * Reads environment and displays validation results in a table.
 */
export const validateConfigCommand = async () => {
    console.log(chalk.bold.cyan('\n🔍 Sentinel Configuration Validator\n'));

    const table = new Table({
        head: [
            chalk.white('Variable'),
            chalk.white('Value'),
            chalk.white('Status'),
            chalk.white('Description'),
        ],
        style: { head: [], border: [] },
        colWidths: [25, 30, 12, 30],
    });

    let errorCount = 0;
    let warnCount = 0;

    for (const varConfig of REQUIRED_VARS) {
        const value = process.env[varConfig.name] || varConfig.default;
        const isRequired = varConfig.required !== false;
        let status = chalk.green('✅ OK');
        let displayValue = value || chalk.gray('(not set)');

        // Mask sensitive values
        if (varConfig.name.includes('SECRET') || varConfig.name.includes('PASSWORD') || varConfig.name.includes('TOKEN')) {
            if (value) {
                displayValue = value.substring(0, 4) + '****';
            }
        }

        if (!value && isRequired) {
            status = chalk.red('❌ Missing');
            displayValue = chalk.red('NOT SET');
            errorCount++;
        } else if (!value && !isRequired) {
            status = chalk.gray('⏭ Skip');
            displayValue = chalk.gray('(optional)');
        } else if (varConfig.type === 'url' && !isValidUrl(value)) {
            status = chalk.red('❌ Invalid');
            errorCount++;
        } else if (varConfig.type === 'port' && !isValidPort(value)) {
            status = chalk.red('❌ Invalid');
            errorCount++;
        } else if (varConfig.type === 'enum' && varConfig.values && !varConfig.values.includes(value)) {
            status = chalk.red('❌ Invalid');
            errorCount++;
        }

        // Security warnings for JWT_SECRET
        if (varConfig.name === 'JWT_SECRET' && value && (value.includes('change-this') || value.length < 32)) {
            status = chalk.yellow('⚠️ Weak');
            warnCount++;
        }

        table.push([
            chalk.bold(varConfig.name),
            displayValue,
            status,
            chalk.gray(varConfig.description),
        ]);
    }

    console.log(table.toString());
    console.log('');

    if (errorCount > 0) {
        console.log(chalk.red(`❌ ${errorCount} configuration error(s) found.`));
        console.log(chalk.gray('   Run with the backend .env file loaded, or set the variables in your shell.\n'));
    } else if (warnCount > 0) {
        console.log(chalk.yellow(`⚠️  Configuration valid with ${warnCount} warning(s).`));
        console.log(chalk.gray('   Review warnings above before deploying to production.\n'));
    } else {
        console.log(chalk.green('✅ All configuration variables are valid!\n'));
    }
};
