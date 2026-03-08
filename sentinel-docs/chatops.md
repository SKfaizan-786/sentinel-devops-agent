# ChatOps Integration Guide

Sentinel DevOps Agent provides rich, interactive notifications via Slack, Discord, and Microsoft Teams. This guide explains how to configure webhooks for each platform and set up the interactive Action endpoints for Slack to support Sentinel's automated healing workflows.

## 1. Setting Up Slack Webhooks and Interactions

Slack integration requires creating a Slack App with incoming webhooks and optionally interactive components for "Approve/Decline Recovery" buttons.

### Generating the Webhook URL

1. Go to [Slack API: Applications](https://api.slack.com/apps) and click **Create New App**.
2. Select **From scratch**, name your app (e.g., _Sentinel DevOps Agent_), and pick the workspace.
3. Once created, go to **Incoming Webhooks** on the left sidebar and toggle **Activate Incoming Webhooks** to **On**.
4. Click **Add New Webhook to Workspace**, select the channel you want Sentinel to post to, and authorize.
5. Copy the generated **Webhook URL** (it looks like `https://hooks.slack.com/services/...`).
6. Paste this URL into the **Slack Webhook URL** field in your Sentinel Dashboard under **Settings -> Notifications**.

### Enabling Interactive Action Buttons (Optional)

When Sentinel detects an `incident.detected` status, it will send a message with "Approve Recovery" and "Decline Recovery" buttons. To make these work:

1. In your Slack App settings, go to **Interactivity & Shortcuts** on the left sidebar.
2. Toggle **Interactivity** to **On**.
3. In the **Request URL** field, enter your public backend URL appended with the interactive route. For example: `https://your-sentinel-domain.com/api/chatops/slack/actions` (or use a tool like ngrok if testing locally).
4. Click **Save Changes**.
   Whenever a user clicks a button, Slack will POST an action payload to this URL.

---

## 2. Setting Up Discord Webhooks

Discord integrations utilize built-in Webhooks to post rich, color-coded Incident embed cards.

### Generating the Webhook URL

1. Open Discord and go to the text channel where you want the notifications.
2. Click the **Edit Channel** (gear icon) next to the channel name.
3. Navigate to **Integrations** and click **Webhooks**.
4. Click **New Webhook**. You can rename it (e.g., _Sentinel Alert Bot_) and assign an avatar.
5. Click **Copy Webhook URL** (it looks like `https://discord.com/api/webhooks/...`).
6. Paste this URL into the **Discord Webhook URL** field in your Sentinel Dashboard.

---

## 3. Setting Up Microsoft Teams Webhooks

Teams integration pushes Adaptive Cards securely via an Incoming Webhook connector.

### Generating the Webhook URL

1. Open Microsoft Teams, navigate to the channel, click the **More options (...)** next to the channel name, and select **Workflows** or **Connectors**.
2. Search for the **Incoming Webhook** connector and click **Add** or **Configure**.
3. Provide a name for the webhook (e.g., _Sentinel Alerts_) and optionally upload an image.
4. Click **Create** and copy the generated **Webhook URL** (it looks like `https://...webhook.office.com/...`).
5. Paste this URL into the **Microsoft Teams Webhook URL** field in your Sentinel Dashboard.

---

## Testing Your Configuration

Once your webhooks are inputted:

1. Navigate to **Settings -> Notifications** in the Sentinel Dashboard.
2. Next to your configured webhook URL, press the **Send Test Message** button.
3. Verify your channel received the mock `sentinel.test` notification.
   - You should see a "Test Successful" badge appear in the UI if the backend properly dispatched it.

## Event Preferences

You can toggle `Notify on New Incident` and `Notify on Healing Completion` within the Dashboard UI. This instantly dictates how ChatOps handles real-time alerts without requiring terminal modifications or server restarts.
