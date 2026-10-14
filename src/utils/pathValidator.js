const fs = require('fs');
const path = require('path');

/**
 * Validates a repository or project filesystem path.
 * 
 * @param {string} targetPath - The path supplied by user
 * @returns {{ isValid: boolean, resolvedPath: string|null, dirName: string|null, error: string|null }}
 */
function validateProjectPath(targetPath) {
  if (!targetPath || typeof targetPath !== 'string' || targetPath.trim() === '') {
    return {
      isValid: false,
      resolvedPath: null,
      dirName: null,
      error: 'Project path is required. Please specify a directory path to analyze.',
    };
  }

  const cleanedPath = targetPath.trim();
  const resolved = path.resolve(cleanedPath);

  if (!fs.existsSync(resolved)) {
    return {
      isValid: false,
      resolvedPath: resolved,
      dirName: null,
      error: `Specified path does not exist: "${resolved}"`,
    };
  }

  try {
    const stats = fs.statSync(resolved);
    if (!stats.isDirectory()) {
      return {
        isValid: false,
        resolvedPath: resolved,
        dirName: path.basename(resolved),
        error: `Target path is a file, not a directory: "${resolved}". The agent requires a repository root folder.`,
      };
    }
  } catch (err) {
    return {
      isValid: false,
      resolvedPath: resolved,
      dirName: null,
      error: `Unable to access path "${resolved}": ${err.message}`,
    };
  }

  return {
    isValid: true,
    resolvedPath: resolved,
    dirName: path.basename(resolved),
    error: null,
  };
}

module.exports = {
  validateProjectPath,
};
