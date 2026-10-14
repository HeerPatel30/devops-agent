const ProjectController = require('./controllers/ProjectController');
const logger = require('./utils/logger');

/**
 * Main application router and argument parser.
 */
class App {
  /**
   * @param {Object} [dependencies={}]
   * @param {ProjectController} [dependencies.projectController]
   */
  constructor({ projectController = new ProjectController() } = {}) {
    this.projectController = projectController;
  }

  /**
   * Parses CLI arguments and executes the requested command.
   * 
   * @param {string[]} args - Process arguments (e.g. process.argv.slice(2))
   * @returns {Promise<*>}
   */
  async run(args = []) {
    if (args.length === 0) {
      this.projectController.showHelp();
      return;
    }

    const command = args[0].toLowerCase();
    const restArgs = args.slice(1);

    // Parse options
    const isJson = restArgs.includes('--json');
    const noAi = restArgs.includes('--no-ai');

    const options = {
      format: isJson ? 'json' : 'terminal',
      noAi,
    };

    // Filter out options to get positional parameters
    const positionalArgs = restArgs.filter(arg => !arg.startsWith('--'));

    switch (command) {
      case 'analyze': {
        const targetPath = positionalArgs[0];
        return await this.projectController.analyze(targetPath, options);
      }

      case 'help':
      case '--help':
      case '-h': {
        this.projectController.showHelp();
        return;
      }

      default: {
        logger.error(`Unknown command: "${command}"`);
        this.projectController.showHelp();
        process.exitCode = 1;
        return;
      }
    }
  }
}

// Export singleton instance or class
const app = new App();
app.App = App;

module.exports = app;
