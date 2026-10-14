const { getGeminiApiKey, getGeminiModel, getGeminiMaxTokens } = require('../utils/envLoader');

// Maximum characters accepted per prompt to prevent token exhaustion
const MAX_PROMPT_LENGTH = 1000;

// Maximum conversation turns preserved in chat history (sliding window)
const MAX_HISTORY_TURNS = 4;

/**
 * Service to communicate with Google Gemini models.
 * Uses native fetch in Node.js (CommonJS compatible, zero npm dependencies).
 */
class GeminiService {
  /**
   * @param {Object} [options={}]
   * @param {string} [options.apiKey] - Google Gemini API Key
   * @param {string} [options.model] - Gemini model identifier
   * @param {number} [options.maxOutputTokens] - Max tokens to generate per response
   * @param {Function} [options.fetchClient] - Custom fetch client (useful for unit testing)
   */
  constructor({
    apiKey = getGeminiApiKey(),
    model = getGeminiModel(),
    maxOutputTokens = getGeminiMaxTokens(),
    fetchClient = globalThis.fetch,
  } = {}) {
    this.apiKey = apiKey ? apiKey.trim() : null;
    this.model = model || 'gemini-3.5-flash-lite';
    this.maxOutputTokens = Number.isInteger(maxOutputTokens) && maxOutputTokens > 0 ? maxOutputTokens : 300;
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

    const stackFacts = context.detectedStack ? [
      `Architecture: ${context.detectedStack.classification || 'Unknown'}`,
      `Verified Languages: ${context.detectedStack.languages?.join(', ') || 'None'}`,
      `Verified Frameworks: ${context.detectedStack.frameworks?.join(', ') || 'None'}`,
      `Verified Databases/ORMs: ${context.detectedStack.databases?.join(', ') || 'None'}`,
      `DevOps Tools: Docker=${context.detectedStack.devops?.docker ? 'Yes' : 'No'}, CI/CD=${context.detectedStack.devops?.ciCd?.join(', ') || 'None'}`,
      `Manifests Found: ${context.detectedStack.manifestsFound?.slice(0, 10).join(', ') || 'None'}`,
    ].join('\n') : '';

    const userPrompt = `Please analyze the following project repository using the VERIFIED codebase facts:
Project Name: ${context.name}
${stackFacts ? `\nCodebase Ground Truth:\n${stackFacts}\n` : ''}
Key Files: ${filesList}

IMPORTANT: Strictly adhere to the verified languages, frameworks, and databases above. Do not guess or hallucinate unlisted frameworks.

Provide:
1. A concise overview of this project based on its verified stack.
2. Recommended CI/CD & Cloud deployment strategies (e.g. Docker, Kubernetes, AWS/GCP/Azure).
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
        maxOutputTokens: this.maxOutputTokens,
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

  /**
   * Sends a user message with chat history to Gemini for interactive conversation.
   * 
   * @param {string} userMessage - User's input text
   * @param {Array<{ role: string, parts: Array<{ text: string }> }>} [history=[]] - Previous conversation turns
   * @returns {Promise<{ success: boolean, model?: string, reply?: string, error?: string }>}
   */
  async chat(userMessage, history = []) {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'GEMINI_API_KEY is not configured in .env',
      };
    }

    const systemPrompt = `You are 'devops-agent', an expert Senior DevOps and Site Reliability Engineer (SRE).
Your mission is to help engineers with DevOps tasks, CI/CD pipelines, Docker, Kubernetes, cloud deployment (AWS/GCP/Azure), infrastructure-as-code, and project architecture.
Keep answers concise, actionable, and practical with real command or code examples when relevant.`;

    // Input Protection: Truncate oversized prompts to prevent token exhaustion
    const sanitizedInput = typeof userMessage === 'string'
      ? userMessage.trim().slice(0, MAX_PROMPT_LENGTH)
      : '';

    // History Window: Keep only the most recent conversation turns
    const cappedHistory = Array.isArray(history)
      ? history.slice(-MAX_HISTORY_TURNS)
      : [];

    const contents = [
      ...cappedHistory,
      {
        role: 'user',
        parts: [{ text: sanitizedInput }],
      },
    ];

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const payload = {
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: this.maxOutputTokens,
      },
    };

    try {
      const response = await this.fetchClient(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = (data && data.error && data.error.message)
          ? data.error.message
          : `Gemini API returned HTTP status ${response.status}`;
        return { success: false, error: errorMsg };
      }

      const candidate = data.candidates && data.candidates[0];
      const reply = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;

      if (!reply) {
        return { success: false, error: 'No response text received from Gemini model.' };
      }

      return {
        success: true,
        model: this.model,
        reply: reply.trim(),
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to connect to Gemini API: ${err.message}`,
      };
    }
  }
}

module.exports = GeminiService;
