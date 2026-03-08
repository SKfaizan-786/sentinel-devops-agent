const slack = require('../integrations/slack');
const discord = require('../integrations/discord');
const teams = require('../integrations/teams');

let settings = {
    slackWebhook: process.env.SLACK_WEBHOOK_URL,
    discordWebhook: process.env.DISCORD_WEBHOOK_URL,
    teamsWebhook: process.env.TEAMS_WEBHOOK_URL,
    notifyOnNewIncident: process.env.NOTIFY_ON_INCIDENT !== 'false',
    notifyOnHealing: process.env.NOTIFY_ON_HEALING !== 'false'
};

const updateSettings = (newSettings) => {
    settings = { ...settings, ...newSettings };
};

const getSettings = () => settings;

/**
 * Send alerts to all configured platforms concurrently
 * @param {Object} payload 
 */
const notifyAllPlatforms = async (payload) => {
    const notifications = [
        slack.sendIncidentAlert(payload, settings).catch(e => { console.error('Slack delivery failed:', e.message); throw e; }),
        discord.sendIncidentAlert(payload, settings).catch(e => { console.error('Discord delivery failed:', e.message); throw e; }),
        teams.sendIncidentAlert(payload, settings).catch(e => { console.error('Teams delivery failed:', e.message); throw e; })
    ];

    try {
        await Promise.all(notifications);
    } catch (error) {
        // Proper error handling avoiding swallowing the failures
        console.error('Failed to deliver one or more ChatOps notifications', error);
    }
};

/**
 * Handle incident.detected event
 * @param {Object} incidentData 
 */
const handleIncidentDetected = async (incidentData) => {
    if (settings.notifyOnNewIncident === false) {
        console.log('Skipping incident.detected notification due to user preference.');
        return;
    }
    const payload = { ...incidentData, status: 'incident.detected' };
    await notifyAllPlatforms(payload);
};

/**
 * Handle healing.started event
 * @param {Object} incidentData 
 */
const handleHealingStarted = async (incidentData) => {
    const payload = { ...incidentData, status: 'healing.started' };
    await notifyAllPlatforms(payload);
};

/**
 * Handle healing.completed event
 * @param {Object} incidentData 
 */
const handleHealingCompleted = async (incidentData) => {
    if (settings.notifyOnHealing === false) {
        console.log('Skipping healing.completed notification due to user preference.');
        return;
    }
    const payload = { ...incidentData, status: 'healing.completed' };
    await notifyAllPlatforms(payload);
};

/**
 * Route event to appropriate handler based on event type
 * @param {string} eventType - The type of event (incident.detected, healing.started, etc.)
 * @param {Object} incidentData - Data context of the incident
 */
const routeEvent = async (eventType, incidentData) => {
    switch (eventType) {
        case 'incident.detected':
            await handleIncidentDetected(incidentData);
            break;
        case 'healing.started':
            await handleHealingStarted(incidentData);
            break;
        case 'healing.completed':
            await handleHealingCompleted(incidentData);
            break;
        default:
            console.warn(`Notifications Router: Unknown event type '${eventType}'`);
    }
};

module.exports = {
    handleIncidentDetected,
    handleHealingStarted,
    handleHealingCompleted,
    routeEvent,
    getSettings,
    updateSettings
};
