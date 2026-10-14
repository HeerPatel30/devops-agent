const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const StackDetectorService = require('../src/services/StackDetectorService');

describe('StackDetectorService', () => {
  const detector = new StackDetectorService();
  let tempTestDir;

  before(() => {
    tempTestDir = fs.mkdtempSync(path.join(os.tmpdir(), 'stack-test-'));

    // Create a mock Full-Stack Node + SQL + Docker project structure
    fs.writeFileSync(
      path.join(tempTestDir, 'package.json'),
      JSON.stringify({
        name: 'fullstack-app',
        dependencies: {
          express: '^4.18.2',
          mysql2: '^3.6.0',
          sequelize: '^6.35.0',
          react: '^18.2.0',
        },
      })
    );

    fs.writeFileSync(path.join(tempTestDir, 'server.js'), 'console.log("hello");');
    fs.writeFileSync(path.join(tempTestDir, 'Dockerfile'), 'FROM node:24-alpine');
    fs.writeFileSync(path.join(tempTestDir, 'schema.sql'), 'CREATE TABLE users (id INT);');

    // Create GitHub Actions workflow
    const workflowsDir = path.join(tempTestDir, '.github', 'workflows');
    fs.mkdirSync(workflowsDir, { recursive: true });
    fs.writeFileSync(path.join(workflowsDir, 'ci.yml'), 'name: CI');
  });

  after(() => {
    if (tempTestDir && fs.existsSync(tempTestDir)) {
      fs.rmSync(tempTestDir, { recursive: true, force: true });
    }
  });

  test('accurately detects Node.js, Express, React, MySQL, Sequelize, Docker, and GitHub Actions', async () => {
    const result = await detector.detect(tempTestDir);

    assert.ok(result.languages.includes('Node.js (JavaScript)'));
    assert.ok(result.languages.includes('SQL'));
    assert.ok(result.frameworks.includes('Express'));
    assert.ok(result.frameworks.includes('React'));
    assert.ok(result.databases.includes('MySQL'));
    assert.ok(result.databases.includes('Sequelize (SQL ORM)'));
    assert.strictEqual(result.devops.docker, true);
    assert.ok(result.devops.ciCd.includes('GitHub Actions'));
    assert.ok(result.manifestsFound.includes('package.json'));
    assert.ok(result.manifestsFound.includes('Dockerfile'));
  });

  test('returns empty report gracefully for non-existent path', async () => {
    const result = await detector.detect('C:\\non_existent_folder_xyz');
    assert.strictEqual(result.languages.length, 0);
    assert.strictEqual(result.frameworks.length, 0);
    assert.strictEqual(result.databases.length, 0);
  });
});
