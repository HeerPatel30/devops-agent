#!/usr/bin/env node

/**
 * Universal DevOps Automation Agent
 * CLI Entry Point
 */

const app = require('./src/app');
const ErrorHandler = require('./src/utils/errorHandler');

// Run the application with user-supplied CLI arguments
app.run(process.argv.slice(2)).catch((err) => {
  ErrorHandler.handleUnexpectedError(err);
});
