const express = require('express');
const { loadEnvironment, getGeminiApiKey, getGeminiModel } = require('./src/utils/envLoader');
const apiRoutes = require('./src/routes');
const logger = require('./src/utils/logger');

// Ensure .env is loaded
loadEnvironment();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Mount the API routes
app.use('/api', apiRoutes);

// Welcome root endpoint
app.get('/', (req, res) => {
  res.json({
    message: '🚀 Universal DevOps Automation Agent API Server',
    status: 'Running',
    docs: {
      health: 'GET /api/projects/health',
      analyze: 'POST /api/projects/analyze (body: { "path": "C:\\path\\to\\project" })',
    },
    geminiStatus: getGeminiApiKey() ? `Connected (${getGeminiModel()})` : 'Not configured (add GEMINI_API_KEY in .env)',
  });
});

// Start listening if run directly
let server = null;
if (require.main === module) {
  server = app.listen(PORT, () => {
    logger.raw('');
    logger.success(`DevOps Automation Agent API Server running on port ${PORT}!`);
    logger.info(`Root:   http://localhost:${PORT}`);
    logger.info(`Health: http://localhost:${PORT}/api/projects/health`);
    logger.info(`Docs:   POST http://localhost:${PORT}/api/projects/analyze`);
    if (!getGeminiApiKey()) {
      logger.warn('GEMINI_API_KEY is not set in .env. AI assessment will be skipped.');
    } else {
      logger.success(`Gemini AI active with model: ${getGeminiModel()}`);
    }
    logger.raw('');
  });
}

module.exports = { app, server };
