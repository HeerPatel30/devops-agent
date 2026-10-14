const fs = require('fs');
const path = require('path');
const readline = require('node:readline/promises');
const Project = require('../models/Project');
const ProjectReportView = require('../views/ProjectReportView');
const { validateProjectPath } = require('../utils/pathValidator');
const ErrorHandler = require('../utils/errorHandler');
const GeminiService = require('../services/GeminiService');
const GitService = require('../services/GitService');
const StackDetectorService = require('../services/StackDetectorService');
const logger = require('../utils/logger');

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
   * @param {GitService} [dependencies.gitService]
   * @param {StackDetectorService} [dependencies.stackDetector]
   */
  constructor({
    view = new ProjectReportView(),
    validator = { validateProjectPath },
    errorHandler = ErrorHandler,
    geminiService = new GeminiService(),
    gitService = new GitService(),
    stackDetector = new StackDetectorService(),
  } = {}) {
    this.view = view;
    this.validator = validator;
    this.errorHandler = errorHandler;
    this.geminiService = geminiService;
    this.gitService = gitService;
    this.stackDetector = stackDetector;
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

  /**
   * Route Handler: POST /api/projects/chat
   * Body: { "message": "How do I Dockerize Node.js?", "history": [...] }
   */
  async chatMessage(req, res) {
    try {
      const { message, history = [] } = req.body || {};

      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Missing required field "message" in request body.',
        });
      }

      if (message.length > 1000) {
        return res.status(400).json({
          success: false,
          error: 'Prompt exceeds maximum allowed length of 1,000 characters to protect token quota.',
        });
      }

      const result = await this.geminiService.chat(message.trim(), history);

      if (!result.success) {
        return res.status(500).json({
          success: false,
          error: result.error,
        });
      }

      return res.status(200).json({
        success: true,
        model: result.model,
        reply: result.reply,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: `Internal server error: ${err.message}`,
      });
    }
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
    let tempGitPath = null;
    try {
      let targetDirectory = null;
      let projectName = null;
      let isGit = false;

      // Check if user supplied a remote Git URL
      if (this.gitService && this.gitService.isGitUrl(rawPath)) {
        isGit = true;
        if (!options.suppressCliRender) {
          logger.info(`Detected remote Git repository. Shallow cloning "${rawPath}" for analysis...`);
        }
        const cloneResult = await this.gitService.cloneRepository(rawPath);
        if (!cloneResult.success) {
          if (!options.suppressCliRender) {
            this.view.renderError(cloneResult.error, options);
            process.exitCode = 1;
          }
          return { success: false, error: cloneResult.error };
        }
        targetDirectory = cloneResult.localPath;
        projectName = cloneResult.dirName;
        tempGitPath = cloneResult.localPath;
      } else {
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
        targetDirectory = validation.resolvedPath;
        projectName = validation.dirName;
      }

      const project = new Project({
        name: projectName,
        rootPath: targetDirectory,
        status: 'VALIDATED',
        validatedAt: new Date(),
      });

      if (isGit) {
        project.sourceType = 'git';
        project.gitUrl = rawPath;
      }

      // Universal Stack & Architecture Discovery
      if (this.stackDetector) {
        const detectedStack = await this.stackDetector.detect(targetDirectory);
        project.detectedStack = detectedStack;
        project.technologies = Array.from(new Set([
          ...detectedStack.languages,
          ...detectedStack.frameworks,
          ...detectedStack.databases,
        ]));
      }

      // Collect top-level file clues for context (ignoring heavy folders)
      const topFiles = this._getDirectoryOverview(targetDirectory);

      // Gemini AI DevOps Assessment
      const canRunAi = this.geminiService.isConfigured() && !options.noAi;
      if (canRunAi) {
        const aiResult = await this.geminiService.generateDevOpsAssessment({
          name: project.name,
          rootPath: project.rootPath,
          files: topFiles,
          detectedStack: project.detectedStack,
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
    } finally {
      if (tempGitPath && this.gitService) {
        this.gitService.cleanup(tempGitPath);
      }
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
   * Starts an interactive chat loop on the terminal.
   */
  async startInteractiveChat() {
    if (!this.geminiService.isConfigured()) {
      logger.raw('\n❌ Error: GEMINI_API_KEY is not configured in your .env file.\n');
      return;
    }

    const { colors } = logger;
    logger.raw('');
    logger.raw(`${colors.cyan}======================================================================${colors.reset}`);
    logger.raw(`${colors.bright}${colors.cyan}         DEVOPS AUTOMATION AGENT - INTERACTIVE CHAT MODE${colors.reset}`);
    logger.raw(`${colors.cyan}======================================================================${colors.reset}`);
    logger.raw(`Model:    ${colors.yellow}${this.geminiService.model}${colors.reset}`);
    logger.raw(`Ready to answer your DevOps, CI/CD, Docker, Kubernetes & cloud questions.`);
    logger.raw(`Commands: ${colors.bright}'analyze <path or git-url>'${colors.reset} to inspect a project`);
    logger.raw(`          ${colors.bright}'clear'${colors.reset} to reset history, ${colors.bright}'exit'${colors.reset} or ${colors.bright}'quit'${colors.reset} to leave.`);
    logger.raw(`${colors.cyan}======================================================================${colors.reset}\n`);

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const history = [];

    try {
      while (true) {
        const input = await rl.question(`${colors.bright}${colors.green}You > ${colors.reset}`);
        const trimmed = input.trim();

        if (!trimmed) continue;

        if (trimmed.toLowerCase() === 'exit' || trimmed.toLowerCase() === 'quit') {
          logger.raw(`\n${colors.cyan}👋 Exiting DevOps Agent chat. Have a great day!${colors.reset}\n`);
          break;
        }

        if (trimmed.toLowerCase() === 'clear') {
          history.length = 0;
          logger.raw(`\n${colors.dim}[Conversation history cleared]${colors.reset}\n`);
          continue;
        }

        // Support analyzing repositories directly inside chat
        const isAnalyzeCmd = /^(?:\/)?analyze\s+(.+)$/i.exec(trimmed);
        const gitUrlMatch = /(https?:\/\/(?:www\.)?(?:github\.com|gitlab\.com|bitbucket\.org)\/[^\s]+)/i.exec(trimmed);

        if (isAnalyzeCmd || (gitUrlMatch && trimmed.toLowerCase().includes('analyze'))) {
          const target = isAnalyzeCmd ? isAnalyzeCmd[1].trim() : gitUrlMatch[1].trim();
          logger.raw(`\n🔍 ${colors.cyan}Running deep analysis on:${colors.reset} ${target}\n`);
          const analyzeResult = await this.analyze(target, { format: 'terminal' });

          if (analyzeResult.success && analyzeResult.project) {
            const stack = analyzeResult.project.detectedStack;
            const stackSummary = `Repository: ${analyzeResult.project.name}
Architecture: ${stack?.classification || 'Application'}
Languages: ${stack?.languages?.join(', ') || 'None'}
Frameworks: ${stack?.frameworks?.join(', ') || 'None'}
Databases: ${stack?.databases?.join(', ') || 'None'}
Docker: ${stack?.devops?.docker ? 'Yes' : 'No'}
CI/CD: ${stack?.devops?.ciCd?.join(', ') || 'None'}`;

            history.push({ role: 'user', parts: [{ text: `Here are the verified codebase facts for "${analyzeResult.project.name}":\n${stackSummary}` }] });
            history.push({ role: 'model', parts: [{ text: `I have analyzed "${analyzeResult.project.name}" and loaded its verified tech stack into our session. What DevOps, CI/CD, or containerization help do you need with this project?` }] });
          }
          continue;
        }

        process.stdout.write(`\n${colors.bright}${colors.yellow}🤖 DevOps Agent is thinking...${colors.reset}\r`);
        const result = await this.geminiService.chat(trimmed, history);
        process.stdout.write('                                          \r');

        if (result.success) {
          logger.raw(`${colors.bright}${colors.yellow}🤖 Agent:${colors.reset}\n${result.reply}\n`);
          history.push({ role: 'user', parts: [{ text: trimmed }] });
          history.push({ role: 'model', parts: [{ text: result.reply }] });
        } else {
          logger.raw(`\n${colors.red}Error: ${result.error}${colors.reset}\n`);
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        logger.raw(`\n${colors.red}Chat error: ${err.message}${colors.reset}\n`);
      }
    } finally {
      rl.close();
    }
  }

  /**
   * Answers a one-shot DevOps question directly from CLI arguments.
   * 
   * @param {string} question - Question to ask
   */
  async askQuestion(question) {
    if (!question || !question.trim()) {
      logger.raw('\n❌ Error: Please provide a question. Example: node index.js ask "How do I Dockerize Node.js?"\n');
      return;
    }

    if (!this.geminiService.isConfigured()) {
      logger.raw('\n❌ Error: GEMINI_API_KEY is not configured in your .env file.\n');
      return;
    }

    const { colors } = logger;
    logger.raw(`\n${colors.bright}${colors.yellow}🤖 DevOps Agent is thinking...${colors.reset}\r`);
    const result = await this.geminiService.chat(question.trim());
    process.stdout.write('                                          \r');

    if (result.success) {
      logger.raw(`${colors.bright}${colors.yellow}🤖 Agent (${result.model}):${colors.reset}\n\n${result.reply}\n`);
    } else {
      logger.raw(`\n${colors.red}Error: ${result.error}${colors.reset}\n`);
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
