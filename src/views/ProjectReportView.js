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
   * @param {boolean} [options.showAiTip=false] - Whether to show AI configuration tip
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
    logger.raw(`${colors.bright}Source Type:${colors.reset}     ${project.sourceType === 'git' ? `Remote Git (${project.gitUrl})` : 'Local Filesystem'}`);
    logger.raw(`${colors.bright}Validated At:${colors.reset}    ${project.validatedAt.toLocaleString()}`);

    // Detected Stack Section
    if (project.detectedStack) {
      const stack = project.detectedStack;
      logger.raw(subDivider);
      logger.raw(`${colors.bright}${colors.cyan}🔍 DETECTED ARCHITECTURE & TECH STACK:${colors.reset}`);
      logger.raw(subDivider);
      logger.raw(`${colors.bright}Classification:${colors.reset}  ${colors.green}${stack.classification}${colors.reset}`);
      logger.raw(`${colors.bright}Languages:${colors.reset}       ${stack.languages.length ? stack.languages.join(', ') : 'None detected'}`);
      logger.raw(`${colors.bright}Frameworks:${colors.reset}      ${stack.frameworks.length ? stack.frameworks.join(', ') : 'None detected'}`);
      logger.raw(`${colors.bright}Databases:${colors.reset}       ${stack.databases.length ? stack.databases.join(', ') : 'None detected'}`);
      logger.raw(`${colors.bright}Container:${colors.reset}       ${stack.devops.docker ? 'Dockerfile detected' : 'None'}${stack.devops.dockerCompose ? ' + Docker Compose' : ''}`);
      logger.raw(`${colors.bright}CI/CD Pipelines:${colors.reset} ${stack.devops.ciCd.length ? stack.devops.ciCd.join(', ') : 'No CI/CD pipeline detected'}`);
      if (stack.manifestsFound && stack.manifestsFound.length > 0) {
        logger.raw(`${colors.bright}Key Manifests:${colors.reset}   ${stack.manifestsFound.slice(0, 6).join(', ')}`);
      }
    }

    // Gemini AI Assessment Section
    if (project.aiAssessment) {
      logger.raw(subDivider);
      logger.raw(`${colors.bright}${colors.yellow}🤖 GEMINI AI DEVOPS ASSESSMENT (${project.aiAssessment.model}):${colors.reset}`);
      logger.raw(subDivider);
      logger.raw(project.aiAssessment.text);
    } else if (options.showAiTip) {
      logger.raw(subDivider);
      logger.raw(`${colors.dim}💡 Tip: Add GEMINI_API_KEY to your .env file to enable Gemini AI DevOps insights!${colors.reset}`);
    }

    logger.raw(subDivider);
    logger.raw(`${colors.bright}Active Milestone:${colors.reset} Milestone 2 (Universal Stack Discovery + Gemini SRE)`);
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
    logger.raw('  analyze <path>    Validate, inspect, and assess a target software project');
    logger.raw('  chat              Start interactive terminal chat session with DevOps Agent');
    logger.raw('  ask "<question>"  Ask a single DevOps question directly in terminal');
    logger.raw('  help, --help, -h  Display this help guide');
    logger.raw('');
    logger.raw(`${colors.bright}OPTIONS:${colors.reset}`);
    logger.raw('  --json            Output results in structured JSON format');
    logger.raw('  --no-ai           Skip Gemini AI assessment even if GEMINI_API_KEY is configured');
    logger.raw('');
    logger.raw(`${colors.bright}EXAMPLES:${colors.reset}`);
    logger.raw('  node index.js chat');
    logger.raw('  node index.js ask "How do I create a multi-stage Dockerfile for Node.js?"');
    logger.raw('  node index.js analyze .');
    logger.raw('  npm run dev -- analyze "C:\\my-repo"');
    logger.raw('  npm run dev -- analyze "C:\\my-repo" --json');
    logger.raw('');
  }
}

module.exports = ProjectReportView;
