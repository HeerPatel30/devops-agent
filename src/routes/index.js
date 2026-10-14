const express = require('express');
const router = express.Router();
const projectRoutes = require('./projectRoutes');

// Mount project routes under /api/projects
router.use('/projects', projectRoutes);

// General API root info
router.get('/', (req, res) => {
  res.json({
    name: 'Universal DevOps Automation Agent API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /api/projects/health',
      analyze: 'POST /api/projects/analyze',
    },
  });
});

module.exports = router;
