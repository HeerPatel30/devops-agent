const path = require('path');

/**
 * Model representing a software project/repository.
 * Encapsulates project data and validation rules.
 */
class Project {
  /**
   * @param {Object} data
   * @param {string} data.name - The project display name
   * @param {string} data.rootPath - The absolute filesystem path to project root
   * @param {string} [data.status='INITIALIZED'] - Status of the project inspection
   * @param {Date} [data.validatedAt=new Date()] - Timestamp when path was validated
   */
  constructor({ name, rootPath, status = 'INITIALIZED', validatedAt = new Date() }) {
    this.name = name || (rootPath ? path.basename(rootPath) : 'Unnamed Project');
    this.rootPath = rootPath;
    this.status = status;
    this.validatedAt = validatedAt instanceof Date ? validatedAt : new Date(validatedAt);

    // Initial placeholders for progressive milestones
    this.technologies = [];
    this.pipelines = [];
    this.environmentConfigs = [];
    this.securityFindings = [];

    this.validate();
  }

  /**
   * Validates internal model integrity.
   * Throws an Error if required business constraints are violated.
   */
  validate() {
    if (!this.rootPath || typeof this.rootPath !== 'string') {
      throw new Error('Project Model Error: "rootPath" is required and must be a non-empty string.');
    }

    if (!path.isAbsolute(this.rootPath)) {
      throw new Error(`Project Model Error: "rootPath" must be an absolute path. Received: "${this.rootPath}"`);
    }

    if (!this.name || typeof this.name !== 'string') {
      throw new Error('Project Model Error: "name" is required and must be a non-empty string.');
    }
  }

  /**
   * Returns a high-level summary of the project state.
   * @returns {Object}
   */
  getSummary() {
    return {
      name: this.name,
      rootPath: this.rootPath,
      status: this.status,
      validatedAt: this.validatedAt.toISOString(),
      technologiesCount: this.technologies.length,
      pipelinesCount: this.pipelines.length,
    };
  }

  /**
   * Converts the model to a plain serializable JSON object.
   * @returns {Object}
   */
  toJSON() {
    return {
      name: this.name,
      rootPath: this.rootPath,
      status: this.status,
      validatedAt: this.validatedAt.toISOString(),
      technologies: this.technologies,
      pipelines: this.pipelines,
      environmentConfigs: this.environmentConfigs,
      securityFindings: this.securityFindings,
    };
  }
}

module.exports = Project;
