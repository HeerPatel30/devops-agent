const { getGeminiApiKey, getGeminiModel } = require('../utils/envLoader');

/**
 * Service to communicate with Google Gemini models.
 * Uses native fetch in Node.js (CommonJS compatible, zero npm dependencies).
 */
class GeminiService {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.apiKey] - Google Gemini API Key
   * @param {string} [options.model] - Gemini model identifier (default: gemini-2.5-flash)
   * @param {Function} [options.fetchClient] - Custom fetch client (useful for unit testing)
   */
  constructor({
    apiKey = getGeminiApiKey(),
    model = getGeminiModel(),
    fetchClient = globalThis.fetch,
  } = {}) {
    this.apiKey = apiKey ? apiKey.trim() : null;
    this.model = model || 'gemini-2.5-flash';
    this.fetchClient = fetchClient;
  }

  /**
   * Checks whether the Gemini API key has been configured.
   * @returns {boolean}
   */
  isConfigured() {
    return Boolean(this.apiKey && this.apiKey.length > 0);
  }

  /**
   * Generates a DevOps architectural assessment for a project.
   * 
   * @param {Object} context
   * @param {string} context.name - Project name
   * @param {string} context.rootPath - Repository root directory
   * @param {string[]} [context.files=[]] - Key files discovered in the repo root
   * @returns {Promise<{ success: boolean, model?: string, assessment?: string, error?: string, configured: boolean }>}
   */
  async generateDevOpsAssessment(context) {
    if (!this.isConfigured()) {
      return {
        success: false,
        configured: false,
        error: 'GEMINI_API_KEY is not configured in .env',
      };
    }

    const systemPrompt = `You are 'devops-agent', an expert Senior DevOps and Site Reliability Engineer (SRE).
Your mission is to provide concise, practical, high-value architectural advice for software repositories.
Guidelines:
1. Be direct, clear, and actionable. Avoid generic fluff.
2. Highlight recommended CI/CD pipelines, containerization best practices, and security measures.
3. Suggest the top 2-3 immediate DevOps improvements for this project.`;

    const filesList = context.files && context.files.length > 0
      ? context.files.join(', ')
      : 'No files supplied';

    const userPrompt = `Please analyze the following project repository:
Project Name: ${context.name}
Root Path: ${context.rootPath}
Root Files/Folders: ${filesList}

Provide:
1. A brief 1-2 sentence overview of what this project appears to be.
2. Recommended CI/CD & Cloud deployment strategies (e.g. Azure, Docker, Kubernetes).
3. Recommended security checks (secret scanning, dependency auditing).`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userPrompt }],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    };

    try {
      const response = await this.fetchClient(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = (data && data.error && data.error.message)
          ? data.error.message
          : `Gemini API returned HTTP status ${response.status}`;
        return {
          success: false,
          configured: true,
          error: errorMsg,
        };
      }

      const candidate = data.candidates && data.candidates[0];
      const text = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;

      if (!text) {
        return {
          success: false,
          configured: true,
          error: 'No response text received from Gemini model.',
        };
      }

      return {
        success: true,
        configured: true,
        model: this.model,
        assessment: text.trim(),
      };
    } catch (err) {
      return {
        success: false,
        configured: true,
        error: `Failed to connect to Gemini API: ${err.message}`,
      };
    }
  }
}

module.exports = GeminiService;
