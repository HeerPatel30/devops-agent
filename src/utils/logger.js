/**
 * Simple, zero-dependency console logger with ANSI colors.
 * Works across Windows PowerShell, Linux, and macOS terminals.
 */

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const logger = {
  info(message) {
    console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
  },

  success(message) {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
  },

  warn(message) {
    console.warn(`${colors.yellow}[WARN]${colors.reset} ${message}`);
  },

  error(message) {
    console.error(`${colors.red}[ERROR]${colors.reset} ${message}`);
  },

  debug(message) {
    if (process.env.LOG_LEVEL === 'debug') {
      console.log(`${colors.gray}[DEBUG] ${message}${colors.reset}`);
    }
  },

  raw(message) {
    console.log(message);
  },

  colors,
};

module.exports = logger;
