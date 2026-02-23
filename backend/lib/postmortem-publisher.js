// Post-mortem publishing service
// This module handles multi-target distribution

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');

module.exports = {
  publishPostMortem,
  saveToFile,
  generateFilename,
  publishToSlack,
  publishToEmail,
  publishToConfluence,
  publishToGitHub
};

/**
 * Generate unique filename for post-mortem
 * @param {Object} incident - Incident object
 * @returns {String} Filename in format YYYY-MM-DD-container-name.md
 */
function generateFilename(incident) {
  const date = incident.timestamp ? new Date(incident.timestamp) : new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Sanitize container name
  const container = (incident.container || incident.containerName || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  return `${year}-${month}-${day}-${container}.md`;
}

/**
 * Save post-mortem to file system
 * @param {String} markdown - Post-mortem markdown content
 * @param {Object} incident - Incident object for filename generation
 * @returns {Promise<String>} File path of saved post-mortem
 */
async function saveToFile(markdown, incident) {
  try {
    const dir = path.join(process.cwd(), 'sentinel-postmortems');
    
    // Create directory if it doesn't exist
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
    
    // Generate filename and capture original
    const originalFilename = generateFilename(incident);
    const originalBaseName = originalFilename.replace('.md', '');
    let filename = originalFilename;
    let filepath = path.join(dir, filename);
    
    // Handle filename collisions
    let counter = 1;
    while (true) {
      try {
        await fs.access(filepath);
        // File exists, try with suffix using original base name
        filename = `${originalBaseName}-${counter}.md`;
        filepath = path.join(dir, filename);
        counter++;
      } catch {
        // File doesn't exist, we can use this name
        break;
      }
    }
    
    // Write file with UTF-8 encoding
    await fs.writeFile(filepath, markdown, 'utf-8');
    
    return filepath;
  } catch (error) {
    console.error('[PostMortem Publisher] File save error:', error.message);
    throw new Error(`Failed to save post-mortem to file: ${error.message}`);
  }
}

/**
 * Publish post-mortem summary to Slack
 * @param {Object} postmortem - Post-mortem object
 * @param {String} filePath - Path to saved file
 * @returns {Promise<Object>} Success status
 */
async function publishToSlack(postmortem, filePath) {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return { success: false, skipped: true, reason: 'SLACK_WEBHOOK_URL not configured' };
  }
  
  try {
    const filename = path.basename(filePath);
    const summary = postmortem.markdown.split('\n').slice(0, 5).join('\n');
    
    await axios.post(webhookUrl, {
      text: `📋 *New Incident Post-Mortem Generated*`,
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '📋 Incident Post-Mortem Generated'
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Incident ID:*\n${postmortem.incidentId}`
            },
            {
              type: 'mrkdwn',
              text: `*Generated:*\n${new Date(postmortem.generatedAt).toLocaleString()}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*File:* \`${filename}\``
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `\`\`\`${summary}...\`\`\``
          }
        }
      ]
    }, {
      timeout: 5000
    });
    
    return { success: true };
  } catch (error) {
    console.error('[PostMortem Publisher] Slack error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send post-mortem via email
 * @param {Object} postmortem - Post-mortem object
 * @param {String} filePath - Path to saved file
 * @returns {Promise<Object>} Success status
 */
async function publishToEmail(postmortem, filePath) {
  const smtpConfig = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'sentinel@example.com'
  };
  
  if (!smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
    return { success: false, skipped: true, reason: 'SMTP configuration incomplete' };
  }
  
  const recipients = process.env.ONCALL_EMAILS;
  if (!recipients) {
    return { success: false, skipped: true, reason: 'ONCALL_EMAILS not configured' };
  }
  
  try {
    const transporter = nodemailer.createTransport({
      host: smtpConfig.host,
      port: parseInt(smtpConfig.port) || 587,
      secure: false,
      auth: {
        user: smtpConfig.user,
        pass: smtpConfig.pass
      }
    });
    
    const filename = path.basename(filePath);
    const recipientList = recipients.split(',').map(e => e.trim());
    
    await transporter.sendMail({
      from: smtpConfig.from,
      to: recipientList.join(', '),
      subject: `Incident Post-Mortem: ${filename}`,
      text: `A new incident post-mortem has been generated.\n\nIncident ID: ${postmortem.incidentId}\nGenerated: ${postmortem.generatedAt}\n\nSee attached document for full details.`,
      attachments: [
        {
          filename,
          path: filePath
        }
      ]
    });
    
    return { success: true, recipients: recipientList };
  } catch (error) {
    console.error('[PostMortem Publisher] Email error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * HTML-escape special characters to prevent XSS
 * @param {String} text - Text to escape
 * @returns {String} Escaped text
 */
function escapeHtml(text) {
  const htmlEscapeMap = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return text.replace(/[&<>"']/g, char => htmlEscapeMap[char]);
}

/**
 * Create Confluence page with post-mortem
 * @param {Object} postmortem - Post-mortem object
 * @returns {Promise<Object>} Success status
 */
async function publishToConfluence(postmortem) {
  const confluenceUrl = process.env.CONFLUENCE_URL;
  const confluenceToken = process.env.CONFLUENCE_TOKEN;
  const confluenceSpace = process.env.CONFLUENCE_SPACE || 'DEVOPS';
  
  if (!confluenceUrl || !confluenceToken) {
    return { success: false, skipped: true, reason: 'Confluence configuration incomplete' };
  }
  
  try {
    // HTML-escape markdown content before conversion
    const escapedMarkdown = escapeHtml(postmortem.markdown);
    
    // Convert markdown to Confluence storage format (simplified)
    const storageFormat = escapedMarkdown
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^# (.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    const response = await axios.post(
      `${confluenceUrl}/rest/api/content`,
      {
        type: 'page',
        title: `Incident Post-Mortem - ${postmortem.incidentId}`,
        space: { key: confluenceSpace },
        body: {
          storage: {
            value: storageFormat,
            representation: 'storage'
          }
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${confluenceToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    
    const pageUrl = `${confluenceUrl}/pages/viewpage.action?pageId=${response.data.id}`;
    return { success: true, pageUrl };
  } catch (error) {
    console.error('[PostMortem Publisher] Confluence error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Create GitHub file with post-mortem
 * @param {Object} postmortem - Post-mortem object
 * @param {String} filePath - Path to saved file
 * @returns {Promise<Object>} Success status
 */
async function publishToGitHub(postmortem, filePath) {
  const githubToken = process.env.GITHUB_TOKEN;
  const githubRepo = process.env.GITHUB_REPO;
  const githubBranch = process.env.GITHUB_BRANCH || 'main';
  
  if (!githubToken || !githubRepo) {
    return { success: false, skipped: true, reason: 'GitHub configuration incomplete' };
  }
  
  try {
    const filename = path.basename(filePath);
    const content = Buffer.from(postmortem.markdown).toString('base64');
    const githubPath = `postmortems/${filename}`;
    
    // Check if file already exists to get sha for update
    let existingSha = null;
    try {
      const getResponse = await axios.get(
        `https://api.github.com/repos/${githubRepo}/contents/${githubPath}`,
        {
          headers: {
            'Authorization': `token ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          params: { ref: githubBranch },
          timeout: 10000
        }
      );
      existingSha = getResponse.data.sha;
    } catch (error) {
      // 404 means file doesn't exist, which is fine for creation
      if (error.response?.status !== 404) {
        throw error;
      }
    }
    
    // PUT with sha if updating, without sha if creating
    const putPayload = {
      message: existingSha 
        ? `Update post-mortem for incident ${postmortem.incidentId}`
        : `Add post-mortem for incident ${postmortem.incidentId}`,
      content,
      branch: githubBranch
    };
    
    if (existingSha) {
      putPayload.sha = existingSha;
    }
    
    const response = await axios.put(
      `https://api.github.com/repos/${githubRepo}/contents/${githubPath}`,
      putPayload,
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github.v3+json'
        },
        timeout: 10000
      }
    );
    
    const commitUrl = response.data.commit.html_url;
    return { success: true, commitUrl };
  } catch (error) {
    console.error('[PostMortem Publisher] GitHub error:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Publish post-mortem to all configured targets
 * @param {Object} postmortem - Post-mortem object with markdown content
 * @param {Object} incident - Original incident object
 * @returns {Promise<Object>} Publishing status for each target
 */
async function publishPostMortem(postmortem, incident) {
  const status = {};
  
  try {
    // Always save to file first
    const filePath = await saveToFile(postmortem.markdown, incident);
    status.file = { success: true, path: filePath };
    
    // Publish to optional targets (continue even if one fails)
    const publishingTasks = [];
    
    // Slack
    if (process.env.SLACK_WEBHOOK_URL) {
      publishingTasks.push(
        publishToSlack(postmortem, filePath)
          .then(result => { status.slack = result; })
          .catch(error => { status.slack = { success: false, error: error.message }; })
      );
    }
    
    // Email
    if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
      publishingTasks.push(
        publishToEmail(postmortem, filePath)
          .then(result => { status.email = result; })
          .catch(error => { status.email = { success: false, error: error.message }; })
      );
    }
    
    // Confluence
    if (process.env.CONFLUENCE_URL && process.env.CONFLUENCE_TOKEN) {
      publishingTasks.push(
        publishToConfluence(postmortem)
          .then(result => { status.confluence = result; })
          .catch(error => { status.confluence = { success: false, error: error.message }; })
      );
    }
    
    // GitHub
    if (process.env.GITHUB_TOKEN && process.env.GITHUB_REPO) {
      publishingTasks.push(
        publishToGitHub(postmortem, filePath)
          .then(result => { status.github = result; })
          .catch(error => { status.github = { success: false, error: error.message }; })
      );
    }
    
    // Wait for all publishing tasks to complete
    await Promise.all(publishingTasks);
    
    return status;
  } catch (error) {
    console.error('[PostMortem Publisher] Publishing error:', error.message);
    status.file = { success: false, error: error.message };
    return status;
  }
}
