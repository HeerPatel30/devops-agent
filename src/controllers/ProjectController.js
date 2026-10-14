const fs = require('fs');
const path = require('path');
const Project = require('../models/Project');
const ProjectReportView = require('../views/ProjectReportView');
const { validateProjectPath } = require('../utils/pathValidator');
const ErrorHandler = require('../utils/errorHandler');
const GeminiService = require('../services/GeminiService');

/**
 * Controller handling project analysis operations.
 * Supports both Express API requests (req, res) and direct invocation.
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

  // ==========================================
  // EXPRESS API ROUTE HANDLERS (req, res)
  // ==========================================

  /**
   * Route Handler: POST /api/projects/analyze
   * Body: { "path": "C:\\path\\to\\project", "noAi": false }
   */
  async analyzeProject(req, res) {
    try {
      const { path: targetPath, noAi = false } = req.body || {};

      const result = await this.analyze(targetPath, { noAi, format: 'json', suppressCliRender: true });

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          example: { path: 'C:\\Projects\\my-web-app' },
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Project analysis completed successfully',
        data: result.project.toJSON(),
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: `Internal server error: ${err.message}`,
      });
    }
  }

  /**
   * Route Handler: GET /api/projects/health
   */
  getHealth(req, res) {
    return res.status(200).json({
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      geminiConfigured: this.geminiService.isConfigured(),
      timestamp: new Date().toISOString(),
    });
  }

  // ==========================================
  // CORE BUSINESS ACTION (used by API & CLI)
  // ==========================================

  /**
   * Core logic: Validates path, creates model, calls Gemini, and notifies view.
   * 
   * @param {string} rawPath - Directory path
   * @param {Object} [options={}] - Options (e.g. noAi, format, suppressCliRender)
   * @returns {Promise<{ success: boolean, project?: Project, error?: string }>}
   */
  async analyze(rawPath, options = {}) {
    try {
      const validation = this.validator.validateProjectPath(rawPath);

      if (!validation.isValid) {
        if (!options.suppressCliRender) {
          this.view.renderError(validation.error, options);
          process.exitCode = 1;
        }
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

      if (!options.suppressCliRender) {
        this.view.renderReport(project, options);
      }

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
        .slice(0, 30);
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
