/**
 * Built-in runbook action templates.
 *
 * SECURITY: The run_command action type is intentionally restricted to an
 * explicit allowlist of safe binary names. Arbitrary shell commands are
 * rejected at the route level before they ever reach a compiler or executor.
 */

'use strict';

/** @type {string[]} Binaries that a run_command action may invoke. */
const ALLOWED_COMMAND_BINARIES = Object.freeze([
    'docker',
    'kubectl',
    'systemctl',
]);

/**
 * Validate a run_command action's command parameter.
 *
 * @param {string|undefined} command - The full command string (e.g. "kubectl rollout restart …")
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateRunCommand(command) {
    if (!command || typeof command !== 'string') {
        return { valid: false, reason: 'command must be a non-empty string' };
    }
    const binary = command.trim().split(/\s+/)[0];
    if (!ALLOWED_COMMAND_BINARIES.includes(binary)) {
        return {
            valid: false,
            reason: `Command '${binary}' is not allowed. Permitted binaries: ${ALLOWED_COMMAND_BINARIES.join(', ')}`,
        };
    }
    return { valid: true };
}

/** Action type definitions shown in the builder UI. */
const ACTION_TEMPLATES = [
    {
        type: 'restart_service',
        label: 'Restart Service',
        description: 'Restart a service or container',
        parameters: { service: '' },
    },
    {
        type: 'scale_service',
        label: 'Scale Service',
        description: 'Scale service replicas up or down',
        parameters: { replicas: 1, mode: 'absolute' },
    },
    {
        type: 'send_alert',
        label: 'Send Alert',
        description: 'Send a notification or alert',
        parameters: { channel: 'slack', message: '' },
    },
    {
        type: 'create_jira',
        label: 'Create Jira Ticket',
        description: 'Create a Jira issue for tracking',
        parameters: { project: '', summary: '', priority: 'Medium' },
    },
    {
        type: 'http_request',
        label: 'HTTP Request',
        description: 'Make an HTTP call to an external endpoint',
        parameters: { url: '', method: 'POST', body: {} },
    },
    {
        type: 'run_command',
        label: 'Run Command',
        description: `Run an allowed shell command (permitted: ${ALLOWED_COMMAND_BINARIES.join(', ')})`,
        parameters: { command: '' },
    },
];

/** Trigger type definitions shown in the builder UI. */
const TRIGGER_TEMPLATES = [
    {
        type: 'webhook',
        label: 'Webhook',
        description: 'Trigger via an incoming HTTP webhook',
        parameters: {},
    },
    {
        type: 'schedule',
        label: 'Schedule',
        description: 'Run on a cron schedule',
        parameters: { cron: '0 * * * *' },
    },
    {
        type: 'threshold',
        label: 'Threshold Alert',
        description: 'Fire when a metric crosses a threshold',
        parameters: { metric: '', threshold: 0, window: '5m' },
    },
];

module.exports = { ACTION_TEMPLATES, TRIGGER_TEMPLATES, ALLOWED_COMMAND_BINARIES, validateRunCommand };
