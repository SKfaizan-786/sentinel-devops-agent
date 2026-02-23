// Post-mortem generator implementation
// This module handles LLaMA API interaction and markdown generation

const axios = require('axios');

module.exports = {
  generatePostMortem,
  buildPrompt,
  callLLaMA,
  formatMarkdown,
  extractIncidentContext
};

/**
 * Extract and enrich incident context
 * @param {Object} incident - Raw incident object from aiLogs
 * @returns {Object} Enriched incident context
 */
function extractIncidentContext(incident) {
  // Calculate duration if not provided
  let duration = incident.duration || 'N/A';
  let mttr = 'N/A';
  
  if (incident.timestamp && incident.resolvedAt) {
    const start = new Date(incident.timestamp);
    const end = new Date(incident.resolvedAt);
    const diffMs = end - start;
    
    // Guard against negative duration (resolvedAt < timestamp)
    if (diffMs <= 0) {
      duration = 'N/A';
      mttr = 'N/A';
    } else {
      const diffSec = Math.floor(diffMs / 1000);
      const minutes = Math.floor(diffSec / 60);
      const seconds = diffSec % 60;
      duration = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
      mttr = duration;
    }
  }
  
  // Format timestamps
  const timestamp = incident.timestamp ? new Date(incident.timestamp).toISOString() : new Date().toISOString();
  const resolvedAt = incident.resolvedAt ? new Date(incident.resolvedAt).toISOString() : null;
  
  // Extract service/container info
  const container = incident.container || incident.containerName || 'unknown';
  const service = incident.service || incident.serviceName || container;
  const severity = incident.severity || 'medium';
  const status = incident.status || 'resolved';
  
  return {
    id: incident.id,
    timestamp,
    resolvedAt,
    duration,
    mttr,
    container,
    service,
    severity,
    status,
    analysis: incident.analysis || incident.summary || 'No analysis available',
    reasoningChain: incident.reasoningChain || [],
    actionsTaken: incident.actionsTaken || [],
    outcome: incident.outcome || 'resolved'
  };
}

/**
 * Build structured prompt for LLaMA
 * @param {Object} incident - Enriched incident context
 * @returns {String} Structured prompt
 */
function buildPrompt(incident) {
  const context = extractIncidentContext(incident);
  
  return `You are an expert SRE writing professional incident post-mortems.
Based on this incident investigation and remediation data, write a detailed post-mortem in markdown format.

INCIDENT DATA:
- Container: ${context.container}
- Severity: ${context.severity}
- Start: ${context.timestamp} (MTTR total time)
- End: ${context.resolvedAt || 'Ongoing'}
- Duration: ${context.duration}
- Root Cause (per AI): ${context.analysis}

Investigation Timeline:
${context.reasoningChain.map(r => `- ${r.description}`).join('\n') || '- AI analysis completed'}

Write a professional post-mortem markdown including:
1. Executive Summary (2 paragraphs)
2. Incident Timeline with exact timestamps and actions
3. Root Cause Analysis (Why it happened, underlying factors)
4. Impact Assessment (X affected services, Y percent availability loss)
5. Remediation Steps (What Sentinel did, what worked, what didn't)
6. Contributing Factors
7. Lessons Learned (Patterns to recognize next time)
8. Prevention Measures (How to prevent this class of failure)

Be specific – use actual container names, error messages, and timestamps.`;
}

/**
 * Call Groq LLaMA API
 * @param {String} prompt - Structured prompt
 * @returns {Promise<String>} Generated markdown content
 */
async function callLLaMA(prompt) {
  const apiKey = process.env.GROQ_API_KEY;
  
  if (!apiKey) {
    throw new Error('GROQ_API_KEY environment variable is not set');
  }
  
  try {
    const response = await axios.post(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SRE writing professional incident post-mortems.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 4096 // Increased to prevent truncation of 8-section post-mortems
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout to accommodate 10-15s generation time
      }
    );
    
    if (!response.data || !response.data.choices || !response.data.choices[0]) {
      throw new Error('Invalid response from LLaMA API');
    }
    
    return response.data.choices[0].message.content;
  } catch (error) {
    // Authentication failures
    if (error.response?.status === 401 || error.response?.status === 403) {
      throw new Error(`LLaMA API authentication failed: invalid or expired API key (status: ${error.response.status})`);
    }
    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new Error('LLaMA API request timed out after 30 seconds');
    }
    // Rate limiting
    if (error.response?.status === 429) {
      throw new Error('LLaMA API rate limit exceeded. Please try again later.');
    }
    // Server errors
    if (error.response?.status >= 500) {
      throw new Error('LLaMA API is temporarily unavailable');
    }
    throw error;
  }
}

/**
 * Validate and format generated markdown
 * @param {String} markdown - Raw markdown from LLaMA
 * @returns {Object} Validated markdown with metadata
 */
function formatMarkdown(markdown) {
  const requiredSections = [
    'Executive Summary',
    'Incident Timeline',
    'Root Cause Analysis',
    'Impact Assessment',
    'Remediation Steps',
    'Contributing Factors',
    'Lessons Learned',
    'Prevention Measures'
  ];
  
  // Check for required sections
  const foundSections = [];
  const missingSections = [];
  
  for (const section of requiredSections) {
    if (markdown.includes(section)) {
      foundSections.push(section);
    } else {
      missingSections.push(section);
    }
  }
  
  // Gracefully handle missing sections by adding placeholders
  let enhancedMarkdown = markdown;
  if (missingSections.length > 0) {
    console.warn(`[PostMortem] Missing sections detected: ${missingSections.join(', ')}. Adding placeholders.`);
    
    for (const section of missingSections) {
      enhancedMarkdown += `\n\n## ${section}\n\n*This section was not generated by the AI. Please review and complete manually.*\n`;
      foundSections.push(section);
    }
  }
  
  // Calculate metadata
  const wordCount = enhancedMarkdown.split(/\s+/).length;
  const estimatedReadTime = Math.ceil(wordCount / 200); // Average reading speed
  
  return {
    markdown: enhancedMarkdown,
    metadata: {
      sections: foundSections,
      wordCount,
      estimatedReadTime
    }
  };
}

/**
 * Generate complete post-mortem document
 * @param {Object} incident - Incident object from aiLogs
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} Generated post-mortem with markdown content
 */
async function generatePostMortem(incident, options = {}) {
  // Validate required fields
  if (!incident || !incident.id) {
    throw new Error('Incident ID is required');
  }
  
  if (!incident.timestamp) {
    throw new Error('Incident timestamp is required');
  }
  
  if (!incident.analysis && !incident.summary) {
    throw new Error('Incident analysis or summary is required');
  }
  
  try {
    // Extract context
    const context = extractIncidentContext(incident);
    
    // Build prompt
    const prompt = buildPrompt(context);
    
    // Call LLaMA
    const rawMarkdown = await callLLaMA(prompt);
    
    // Format and validate
    const formatted = formatMarkdown(rawMarkdown);
    
    return {
      incidentId: incident.id,
      markdown: formatted.markdown,
      generatedAt: new Date().toISOString(),
      metadata: formatted.metadata
    };
  } catch (error) {
    console.error('[PostMortem Generator] Error:', error.message);
    throw error;
  }
}
