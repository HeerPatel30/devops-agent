const Project = require('../models/Project');
const ProjectReportView = require('../views/ProjectReportView');
const { validateProjectPath } = require('../utils/pathValidator');
const ErrorHandler = require('../utils/errorHandler');

/**
 * Controller coordinating project validation and reporting.
 * Follows thin-controller pattern and supports dependency injection.
 */
class ProjectController {
  /**
   * @param {Object} [dependencies={}]
   * @param {ProjectReportView} [dependencies.view]
   * @param {Object} [dependencies.validator]
   * @param {ErrorHandler} [dependencies.errorHandler]
   */
  constructor({
    view = new ProjectReportView(),
    validator = { validateProjectPath },
    errorHandler = ErrorHandler,
  } = {}) {
    this.view = view;
    this.validator = validator;
    this.errorHandler = errorHandler;
  }

  /**
   * Coordinates the 'analyze' command for a target project path.
   * 
   * @param {string} rawPath - Target filesystem path supplied by user
   * @param {Object} [options={}] - Command flags (e.g. { format: 'terminal'|'json' })
   * @returns {{ success: boolean, project?: Project, error?: string }}
   */
  analyze(rawPath, options = {}) {
    try {
      const validation = this.validator.validateProjectPath(rawPath);

      if (!validation.isValid) {
        this.view.renderError(validation.error, options);
        process.exitCode = 1;
        return {
          success: false,
          error: validation.error,
        };
      }

      const project = new Project({
        name: validation.dirName,
        rootPath: validation.resolvedPath,
        status: 'VALIDATED',
        validatedAt: new Date(),
      });

      this.view.renderReport(project, options);

      return {
        success: true,
        project,
      };
    } catch (err) {
      this.errorHandler.handleUnexpectedError(err);
      return {
        success: false,
        error: err.message,
      };
    }
  }

  /**
   * Displays the command-line help interface.
   */
  showHelp() {
    this.view.renderHelp();
  }
}

module.exports = ProjectController;
