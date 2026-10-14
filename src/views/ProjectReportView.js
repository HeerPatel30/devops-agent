const logger = require('../utils/logger');

/**
 * View responsible for rendering project-level reports to the user.
 * Supports readable terminal formatting and structured JSON.
 * Contains NO business logic or filesystem operations.
 */
class ProjectReportView {
  /**
   * Renders the project analysis report.
   * 
   * @param {import('../models/Project')} project - The Project model instance
   * @param {Object} [options={}] - Output configuration options
   * @param {string} [options.format='terminal'] - 'terminal' or 'json'
   */
  renderReport(project, options = {}) {
    if (options.format === 'json') {
      logger.raw(JSON.stringify({ success: true, data: project.toJSON() }, null, 2));
      return;
    }

    const { colors } = logger;
    const divider = `${colors.cyan}======================================================================${colors.reset}`;
    const subDivider = `${colors.gray}----------------------------------------------------------------------${colors.reset}`;

    logger.raw('');
    logger.raw(divider);
    logger.raw(`${colors.bright}${colors.cyan}        UNIVERSAL DEVOPS AUTOMATION AGENT - PROJECT REPORT${colors.reset}`);
    logger.raw(divider);
    logger.raw(`${colors.bright}Project Name:${colors.reset}    ${colors.green}${project.name}${colors.reset}`);
    logger.raw(`${colors.bright}Root Path:${colors.reset}       ${project.rootPath}`);
    logger.raw(`${colors.bright}Status:${colors.reset}          ${colors.green}${project.status}${colors.reset}`);
    logger.raw(`${colors.bright}Validated At:${colors.reset}    ${project.validatedAt.toLocaleString()}`);
    logger.raw(subDivider);
    logger.raw(`${colors.bright}Active Milestone:${colors.reset} Milestone 1 (MVC Foundation & Path Validation)`);
    logger.raw(`${colors.dim}Ready for Milestone 2: Project Discovery (detecting stacks, CI/CD, manifests)${colors.reset}`);
    logger.raw(divider);
    logger.raw('');
  }

  /**
   * Renders an error message with actionable user guidance.
   * 
   * @param {string} errorMessage - The error message to present
   * @param {Object} [options={}] - Formatting options
   */
  renderError(errorMessage, options = {}) {
    if (options.format === 'json') {
      logger.raw(JSON.stringify({ success: false, error: errorMessage }, null, 2));
      return;
    }

    const { colors } = logger;
    logger.raw('');
    logger.raw(`${colors.red}========================== ERROR ==========================${colors.reset}`);
    logger.raw(`${colors.bright}${colors.red}Analysis Failed:${colors.reset} ${errorMessage}`);
    logger.raw(`${colors.gray}-----------------------------------------------------------${colors.reset}`);
    logger.raw(`${colors.bright}Usage:${colors.reset}`);
    logger.raw(`  npm run dev -- analyze "<path-to-repository>"`);
    logger.raw(`  node index.js analyze "<path-to-repository>"`);
    logger.raw('');
    logger.raw(`${colors.bright}Examples:${colors.reset}`);
    logger.raw(`  node index.js analyze "."`);
    logger.raw(`  node index.js analyze "C:\\Projects\\my-web-app"`);
    logger.raw(`  node index.js analyze "./my-app" --json`);
    logger.raw(`${colors.red}===========================================================${colors.reset}`);
    logger.raw('');
  }

  /**
   * Renders command-line help screen.
   */
  renderHelp() {
    const { colors } = logger;
    logger.raw('');
    logger.raw(`${colors.bright}${colors.cyan}Universal DevOps Automation Agent (v0.1.0)${colors.reset}`);
    logger.raw('A modular, enterprise-grade DevOps automation tool built on MVC architecture.');
    logger.raw('');
    logger.raw(`${colors.bright}USAGE:${colors.reset}`);
    logger.raw('  node index.js <command> [arguments] [options]');
    logger.raw('  npm run dev -- <command> [arguments] [options]');
    logger.raw('');
    logger.raw(`${colors.bright}COMMANDS:${colors.reset}`);
    logger.raw('  analyze <path>    Validate and inspect a target software project repository');
    logger.raw('  help, --help, -h  Display this help guide');
    logger.raw('');
    logger.raw(`${colors.bright}OPTIONS:${colors.reset}`);
    logger.raw('  --json            Output results in structured JSON format');
    logger.raw('');
    logger.raw(`${colors.bright}EXAMPLES:${colors.reset}`);
    logger.raw('  node index.js analyze .');
    logger.raw('  npm run dev -- analyze "C:\\my-repo"');
    logger.raw('  npm run dev -- analyze "C:\\my-repo" --json');
    logger.raw('');
  }
}

module.exports = ProjectReportView;
