const fs = require('fs');
const path = require('path');
const Project = require('../models/Project');
const ProjectReportView = require('../views/ProjectReportView');
const { validateProjectPath } = require('../utils/pathValidator');
const ErrorHandler = require('../utils/errorHandler');
const GeminiService = require('../services/GeminiService');

/**
 * Controller coordinating project validation, AI assessment, and reporting.
 * Follows thin-controller pattern and supports dependency injection.
 */
class ProjectController {
  /**
   * @param {Object} [dependencies={}]
   * @param {ProjectReportView} [dependencies.view]
   * @param {Object} [dependencies.validator]
   * @param {ErrorHandler} [dependencies.errorHandler]
   * @param {GeminiService} [dependencies.geminiService]
   */
  constructor({
    view = new ProjectReportView(),
    validator = { validateProjectPath },
    errorHandler = ErrorHandler,
    geminiService = new GeminiService(),
  } = {}) {
    this.view = view;
    this.validator = validator;
    this.errorHandler = errorHandler;
    this.geminiService = geminiService;
  }

  /**
   * Coordinates the 'analyze' command for a target project path.
   * 
   * @param {string} rawPath - Target filesystem path supplied by user
   * @param {Object} [options={}] - Command flags (e.g. { format: 'terminal'|'json', noAi: boolean })
   * @returns {Promise<{ success: boolean, project?: Project, error?: string }>}
   */
  async analyze(rawPath, options = {}) {
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

      // Collect top-level file clues for context (ignoring heavy folders)
      const topFiles = this._getDirectoryOverview(validation.resolvedPath);

      // Gemini AI DevOps Assessment
      const canRunAi = this.geminiService.isConfigured() && !options.noAi;
      if (canRunAi) {
        const aiResult = await this.geminiService.generateDevOpsAssessment({
          name: project.name,
          rootPath: project.rootPath,
          files: topFiles,
        });

        if (aiResult.success) {
          project.aiAssessment = {
            model: aiResult.model,
            text: aiResult.assessment,
          };
        }
      } else if (!this.geminiService.isConfigured() && !options.noAi) {
        options.showAiTip = true;
      }

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
   * Helper to safely read top-level directory entries.
   * @private
   */
  _getDirectoryOverview(dirPath) {
    try {
      const ignored = new Set(['.git', 'node_modules', 'dist', 'build', '.vscode', '.idea']);
      return fs.readdirSync(dirPath)
        .filter(entry => !ignored.has(entry))
        .slice(0, 30); // Limit to top 30 files for clean context
    } catch {
      return [];
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
