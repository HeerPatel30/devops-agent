const express = require('express');
const router = express.Router();
const ProjectController = require('../controllers/ProjectController');
const { rateLimiter } = require('../utils/rateLimiter');

// Instantiate controller
const projectController = new ProjectController();

/**
 * Route: POST /api/projects/analyze
 * Body: { "path": "C:\\path\\to\\project", "noAi": false }
 * Description: Validates repository path and returns DevOps assessment with Gemini AI.
 */
router.post('/analyze', rateLimiter, (req, res) => projectController.analyzeProject(req, res));

/**
 * Route: GET /api/projects/health
 * Description: Healthcheck endpoint to verify API server status.
 */
router.get('/health', (req, res) => projectController.getHealth(req, res));

/**
 * Route: POST /api/projects/chat
 * Body: { "message": "How do I configure CI/CD for Docker?" }
 * Description: Chat with the DevOps agent via REST API.
 */
router.post('/chat', rateLimiter, (req, res) => projectController.chatMessage(req, res));

module.exports = router;
