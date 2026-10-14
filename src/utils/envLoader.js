const fs = require('fs');
const path = require('path');

/**
 * Loads .env environment variables using Node.js native env loader.
 * Zero external dependencies.
 */
function loadEnvironment(envPath = path.resolve(process.cwd(), '.env')) {
  if (fs.existsSync(envPath)) {
    try {
      if (typeof process.loadEnvFile === 'function') {
        process.loadEnvFile(envPath);
      }
    } catch (err) {
      // Do not crash if .env has syntax quirks, just ignore or log in debug
      if (process.env.LOG_LEVEL === 'debug') {
        console.warn(`[WARN] Failed to load .env file: ${err.message}`);
      }
    }
  }
}

// Auto-load .env when this module is required
loadEnvironment();

module.exports = {
  loadEnvironment,
  getGeminiApiKey: () => process.env.GEMINI_API_KEY || null,
  getGeminiModel: () => process.env.GEMINI_MODEL || 'gemini-2.5-flash',
};
