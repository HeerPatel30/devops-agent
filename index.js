#!/usr/bin/env node

/**
 * Universal DevOps Automation Agent
 * CLI Entry Point
 */

const app = require('./src/app');

// Run the application with user-supplied CLI arguments
app.run(process.argv.slice(2));
