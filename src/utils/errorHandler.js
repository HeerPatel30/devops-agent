const logger = require('./logger');

/**
 * Centralized error handler utility.
 */
class ErrorHandler {
  /**
   * Handles user-facing operational errors.
   * @param {string|Error} error - Error instance or message
   * @param {number} exitCode - Desired process exit code (default: 1)
   */
  static handleOperationalError(error, exitCode = 1) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    process.exitCode = exitCode;
  }

  /**
   * Handles unexpected system exceptions with stack traces when in debug mode.
   * @param {Error} error - Unexpected error
   */
  static handleUnexpectedError(error) {
    logger.error(`Unexpected system failure: ${error.message}`);
    if (process.env.LOG_LEVEL === 'debug' && error.stack) {
      logger.debug(error.stack);
    }
    process.exitCode = 1;
  }
}

module.exports = ErrorHandler;
