const axios = require('axios');

/**
 * Send an incident alert to Microsoft Teams
 * @param {Object} incidentData - Details of the incident
 */
const sendIncidentAlert = async (incidentData, config = {}) => {
    const webhookUrl = config.teamsWebhook || process.env.TEAMS_WEBHOOK_URL;
    if (!webhookUrl) {
        console.warn("Teams Integration: Missing TEAMS_WEBHOOK_URL.");
        return;
    }

    const { type, id, title, description, status, severity } = incidentData;

    // Use Adaptive Cards v1.4 structure
    const card = {
        "type": "message",
        "attachments": [
            {
                "contentType": "application/vnd.microsoft.card.adaptive",
                "contentUrl": null,
                "content": {
                    "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
                    "type": "AdaptiveCard",
                    "version": "1.4",
                    "body": [
                        {
                            "type": "TextBlock",
                            "text": `Incident Alert: ${title || 'Unknown Incident'}`,
                            "weight": "Bolder",
                            "size": "Medium"
                        },
                        {
                            "type": "FactSet",
                            "facts": [
                                { "title": "Status:", "value": status || 'Unknown' },
                                { "title": "Severity:", "value": severity || 'High' },
                                { "title": "Incident ID:", "value": id || 'N/A' },
                                { "title": "Type:", "value": type || 'N/A' }
                            ]
                        },
                        {
                            "type": "TextBlock",
                            "text": description || 'No description provided.',
                            "wrap": true
                        }
                    ],
                    "actions": status === 'incident.detected' ? [
                        {
                            "type": "Action.OpenUrl",
                            "title": "Review Incident",
                            "url": "http://localhost:3000/dashboard/incidents"
                        }
                    ] : []
                }
            }
        ]
    };

    try {
        await axios.post(webhookUrl, card, { timeout: 30000 });
        console.log(`Teams alert sent for incident ${id}`);
    } catch (error) {
        console.error('Error sending Teams alert:', error.message);
        throw error;
    }
};

module.exports = {
    sendIncidentAlert
};
