/**
 * Runbook Compiler
 *
 * Converts a Sentinel runbook definition into a Kestra YAML flow document.
 * Webhook triggers receive a cryptographically-random per-runbook secret.
 */

'use strict';

const crypto = require('crypto');

/**
 * Map a Sentinel action type to the appropriate Kestra plugin task type.
 *
 * @param {Object} action
 * @returns {string} Kestra plugin class
 */
function resolvePlugin(action) {
    const pluginMap = {
        restart_service: 'io.kestra.plugin.scripts.shell.Commands',
        scale_service: 'io.kestra.plugin.scripts.shell.Commands',
        send_alert: 'io.kestra.plugin.notifications.slack.SlackIncomingWebhook',
        create_jira: 'io.kestra.plugin.jira.issues.Create',
        http_request: 'io.kestra.plugin.core.http.Request',
        run_command: 'io.kestra.plugin.scripts.shell.Commands',
    };
    return pluginMap[action.type] || 'io.kestra.plugin.core.log.Log';
}

/**
 * Generate the Kestra task parameters for an action.
 *
 * @param {Object} action
 * @returns {Object}
 */
function generateActionParameters(action) {
    switch (action.type) {
        case 'restart_service':
            return { commands: [`docker restart "${action.parameters?.service || ''}"`] };
        case 'scale_service':
            return { commands: [`kubectl scale deployment "${action.parameters?.service || ''}" --replicas=${Number(action.parameters?.replicas) || 1}`] };
        case 'send_alert':
            return { url: '{{ envs.SLACK_WEBHOOK_URL }}', payload: JSON.stringify({ text: action.parameters?.message || '' }) };
        case 'create_jira':
            return {
                domain: '{{ envs.JIRA_DOMAIN }}',
                username: '{{ envs.JIRA_USERNAME }}',
                password: '{{ envs.JIRA_API_TOKEN }}',
                projectKey: action.parameters?.project || '',
                summary: action.parameters?.summary || '',
                issueType: 'Bug',
                priority: action.parameters?.priority || 'Medium',
            };
        case 'http_request':
            return {
                uri: action.parameters?.url || '',
                method: action.parameters?.method || 'POST',
                body: JSON.stringify(action.parameters?.body || {}),
            };
        case 'run_command':
            // The route layer has already validated the command is in the allowlist.
            return { commands: [action.parameters?.command || ''] };
        default:
            return { message: `Executing action: ${action.type}` };
    }
}

/**
 * Compile a Sentinel runbook into a Kestra YAML flow string.
 *
 * @param {Object} runbook
 * @param {string} runbook.id
 * @param {string} runbook.name
 * @param {string} [runbook.description]
 * @param {Object[]} [runbook.triggers]
 * @param {Object[]} [runbook.actions]
 * @param {string}   [runbook.webhookSecret] - Pre-generated secret stored in DB
 * @returns {{ yaml: string, webhookSecret: string }}
 */
function compileRunbook(runbook) {
    const { id, name, description = '', triggers = [], actions = [] } = runbook;

    // Re-use existing secret or generate a fresh one per runbook.
    // Secrets stored in the DB are returned to the user only at creation time.
    const webhookSecret = runbook.webhookSecret || crypto.randomBytes(32).toString('hex');

    const kestraTasks = actions.map((action, idx) => ({
        id: `action_${idx}_${action.type}`,
        type: resolvePlugin(action),
        ...generateActionParameters(action),
    }));

    const kestraTriggers = triggers.map((trigger, idx) => {
        if (trigger.type === 'webhook') {
            return {
                id: `webhook_trigger_${idx}`,
                type: 'io.kestra.plugin.core.trigger.Webhook',
                key: webhookSecret,   // ← unique per-runbook secret, NOT a hardcoded literal
            };
        }
        if (trigger.type === 'schedule') {
            return {
                id: `schedule_trigger_${idx}`,
                type: 'io.kestra.plugin.core.trigger.Schedule',
                cron: trigger.parameters?.cron || '0 * * * *',
            };
        }
        return {
            id: `trigger_${idx}`,
            type: 'io.kestra.plugin.core.trigger.Webhook',
            key: webhookSecret,
        };
    });

    // Build a minimal YAML string
    const yamlLines = [
        `id: runbook-${id}`,
        `namespace: sentinel.runbooks`,
        `description: "${description.replace(/"/g, '\\"')}"`,
        ``,
        `tasks:`,
        ...kestraTasks.flatMap(task => [
            `  - id: ${task.id}`,
            `    type: ${task.type}`,
            ...Object.entries(task)
                .filter(([k]) => !['id', 'type'].includes(k))
                .map(([k, v]) => `    ${k}: ${typeof v === 'string' ? `"${v.replace(/"/g, '\\"')}"` : JSON.stringify(v)}`),
        ]),
        ``,
        `triggers:`,
        ...kestraTriggers.flatMap(trigger => [
            `  - id: ${trigger.id}`,
            `    type: ${trigger.type}`,
            ...Object.entries(trigger)
                .filter(([k]) => !['id', 'type'].includes(k))
                .map(([k, v]) => `    ${k}: "${String(v).replace(/"/g, '\\"')}"`),
        ]),
    ];

    return {
        yaml: yamlLines.join('\n'),
        webhookSecret,
    };
}

module.exports = { compileRunbook, resolvePlugin, generateActionParameters };
