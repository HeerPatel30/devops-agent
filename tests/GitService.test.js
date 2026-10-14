const { test, describe } = require('node:test');
const assert = require('node:assert');
const GitService = require('../src/services/GitService');

describe('GitService', () => {
  const gitService = new GitService();

  test('correctly identifies valid remote Git URLs', () => {
    assert.strictEqual(gitService.isGitUrl('https://github.com/user/my-repo'), true);
    assert.strictEqual(gitService.isGitUrl('https://github.com/user/my-repo.git'), true);
    assert.strictEqual(gitService.isGitUrl('http://gitlab.com/group/project'), true);
    assert.strictEqual(gitService.isGitUrl('git@github.com:user/repo.git'), true);
    assert.strictEqual(gitService.isGitUrl('ssh://git@bitbucket.org/team/repo.git'), true);
  });

  test('correctly identifies non-Git local directory paths', () => {
    assert.strictEqual(gitService.isGitUrl('.'), false);
    assert.strictEqual(gitService.isGitUrl('./my-folder'), false);
    assert.strictEqual(gitService.isGitUrl('C:\\Projects\\my-app'), false);
    assert.strictEqual(gitService.isGitUrl('/home/user/project'), false);
    assert.strictEqual(gitService.isGitUrl(''), false);
    assert.strictEqual(gitService.isGitUrl(null), false);
  });

  test('extracts clean repository name from Git URL', () => {
    assert.strictEqual(gitService.getRepoName('https://github.com/user/devops-pipeline.git'), 'devops-pipeline');
    assert.strictEqual(gitService.getRepoName('https://github.com/user/my-web-app/'), 'my-web-app');
    assert.strictEqual(gitService.getRepoName('git@github.com:company/cloud-infra.git'), 'cloud-infra');
  });

  test('returns error when trying to clone an invalid Git URL', async () => {
    const result = await gitService.cloneRepository('not-a-valid-url');
    assert.strictEqual(result.success, false);
    assert.match(result.error, /Invalid Git repository URL/i);
  });
});
