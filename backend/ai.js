const axios = require('axios');

/**
 * @module ai
 * @description Service for AI-powered root cause analysis using the Groq API
 * (LLaMA 3.3-70B). Provides asynchronous analysis of failing services and
 * generates concise, actionable reports.
 */

/**
 * Encapsulates communication with the Groq AI API for DevOps root cause
 * analysis. Instantiated as a singleton — import the module to get the
 * shared instance.
 *
 * @class AIService
 */
class AIService {
    constructor() {
        this.apiKey = process.env.GROQ_API_KEY || process.env.SECRET_GROQ_API_KEY;
        this.apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
        this.model = 'llama-3.3-70b-versatile';
    }

    /**
     * Performs root cause analysis for service failures
     * @param {Object} serviceStates Current state of all services
     * @returns {Promise<string>} The AI generated report
     */
    async performAnalysis(serviceStates) {
        if (!this.apiKey) {
            console.warn('⚠️ GROQ_API_KEY is not set. Skipping AI analysis.');
            return "AI Analysis skipped: No API Key provided. Please set GROQ_API_KEY in your environment.";
        }

        const failingServices = Object.entries(serviceStates)
            .filter(([_, state]) => state.status !== 'healthy')
            .map(([name, state]) => `${name.toUpperCase()} (Status: ${state.status}, Code: ${state.code})`);

        if (failingServices.length === 0) {
            return "System is currently healthy. No anomalies detected.";
        }

        const prompt = `
      You are Sentinel, an autonomous DevOps intelligence agent.
      The following services are currently experiencing issues:
      ${failingServices.join('\n')}

      Context:
      - auth-service: Handles user authentication and RBAC.
      - payment-service: Processes transactions and billing.
      - notification-service: Sends emails and alerts.

      Task:
      Identify the potential root cause based on service dependencies and provide a short, actionable recommendation (max 50 words).
      Format the response as a clear, concise report.
    `.trim();

        try {
            const response = await axios.post(
                this.apiUrl,
                {
                    model: this.model,
                    messages: [
                        { role: 'system', content: 'You are a senior DevOps engineer providing rapid root cause analysis.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.2,
                    max_tokens: 500
                },
                {
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000 // 10s timeout
                }
            );

            return response.data.choices[0].message.content.trim();
        } catch (error) {
            console.error('❌ Groq API Error:', error.response?.data || error.message);
            return `AI Analysis failed: ${error.message}. Check backend logs for details.`;
        }
    }
}

module.exports = new AIService();
