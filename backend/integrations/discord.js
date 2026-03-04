const { Webhook, MessageBuilder } = require('discord-webhook-node');

/**
 * Send an incident alert to Discord
 * @param {Object} incidentData - Details of the incident
 */
const sendIncidentAlert = async (incidentData, config = {}) => {
    const webhookUrl = config.discordWebhook || process.env.DISCORD_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("Discord Integration: Missing DISCORD_WEBHOOK_URL.");
        return;
    }

    const hook = new Webhook(webhookUrl);
    const { type, id, title, description, status, severity } = incidentData;

    let color = '#ff0000'; // Default red indicating incident.detected
    if (status === 'healing.started') color = '#ffa500'; // Orange
    if (status === 'healing.completed') color = '#00ff00'; // Green

    try {
        // Convert hex color to decimal for Discord compatibility
        const colorDec = parseInt(color.replace('#', ''), 16);

        hook.setUsername('Sentinel DevOps Agent');
        
        const embed = new MessageBuilder()
            .setTitle(`Incident Alert: ${title || 'Unknown Incident'}`)
            .setDescription(description || 'No description provided.')
            .addField('Status', status || 'Unknown', true)
            .addField('Severity', severity || 'High', true)
            .addField('Incident ID', id || 'N/A', true)
            .addField('Type', type || 'N/A', true)
            .setColor(colorDec)
            .setTimestamp();

        await hook.send(embed);
        console.log(`Discord alert sent for incident ${id}`);
    } catch (error) {
        console.error('Error sending Discord alert:', error.message);
        throw error;
    }
};

module.exports = {
    sendIncidentAlert
};
