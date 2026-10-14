const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

/**
 * Service handling Git repository detection, shallow cloning, and cleanup.
 * Uses native child_process (zero external npm dependencies).
 */
class GitService {
  /**
   * Checks if an input string is a remote Git repository URL.
   * 
   * @param {string} input - Path or URL
   * @returns {boolean}
   */
  isGitUrl(input) {
    if (!input || typeof input !== 'string') return false;
    const trimmed = input.trim();

    return (
      trimmed.startsWith('https://') ||
      trimmed.startsWith('http://') ||
      trimmed.startsWith('git@') ||
      trimmed.startsWith('ssh://') ||
      trimmed.endsWith('.git') ||
      /^(?:https?:\/\/)?(?:www\.)?(github\.com|gitlab\.com|bitbucket\.org)\/.+/i.test(trimmed)
    );
  }

  /**
   * Derives a clean project name from a Git repository URL.
   * 
   * @param {string} gitUrl - Git repository URL
   * @returns {string} Project name
   */
  getRepoName(gitUrl) {
    if (!gitUrl || typeof gitUrl !== 'string') return 'cloned-repo';
    const cleaned = gitUrl.trim().replace(/\.git\/?$/i, '').replace(/\/+$/, '');
    const segments = cleaned.split('/');
    return segments[segments.length - 1] || 'cloned-repo';
  }

  /**
   * Clones a remote repository shallowly (--depth 1) into a temporary directory.
   * 
   * @param {string} gitUrl - Remote repository URL
   * @param {Object} [options={}]
   * @param {number} [options.timeoutMs=60000] - Clone timeout in milliseconds
   * @returns {Promise<{ success: boolean, localPath?: string, dirName?: string, error?: string }>}
   */
  async cloneRepository(gitUrl, { timeoutMs = 60000 } = {}) {
    if (!this.isGitUrl(gitUrl)) {
      return { success: false, error: `Invalid Git repository URL: "${gitUrl}"` };
    }

    const repoName = this.getRepoName(gitUrl);
    const tempDirName = `devops-agent-${repoName}-${crypto.randomUUID().slice(0, 8)}`;
    const tempPath = path.join(os.tmpdir(), tempDirName);

    return new Promise((resolve) => {
      // Execute git clone --depth 1 <gitUrl> <tempPath>
      execFile(
        'git',
        ['clone', '--depth', '1', gitUrl.trim(), tempPath],
        { timeout: timeoutMs, windowsHide: true },
        (error, stdout, stderr) => {
          if (error) {
            // Attempt cleanup on failure
            this.cleanup(tempPath);
            const message = stderr ? stderr.trim() : error.message;
            return resolve({
              success: false,
              error: `Failed to clone repository from "${gitUrl}": ${message}`,
            });
          }

          return resolve({
            success: true,
            localPath: tempPath,
            dirName: repoName,
          });
        }
      );
    });
  }

  /**
   * Safely removes a cloned temporary repository.
   * 
   * @param {string} tempPath - Absolute path to temporary clone
   */
  cleanup(tempPath) {
    if (tempPath && fs.existsSync(tempPath)) {
      try {
        fs.rmSync(tempPath, { recursive: true, force: true });
      } catch {
        // Silently ignore cleanup failures on transient file locks
      }
    }
  }
}

module.exports = GitService;
