const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');
const { validateProjectPath } = require('../src/utils/pathValidator');

describe('PathValidator Utility', () => {
  test('fails when path is missing, null, or empty string', () => {
    const missingResult = validateProjectPath();
    assert.strictEqual(missingResult.isValid, false);
    assert.match(missingResult.error, /Project path is required/i);

    const emptyResult = validateProjectPath('   ');
    assert.strictEqual(emptyResult.isValid, false);
    assert.match(emptyResult.error, /Project path is required/i);
  });

  test('fails when target path does not exist', () => {
    const fakePath = path.join(__dirname, 'non-existent-directory-xyz-123');
    const result = validateProjectPath(fakePath);
    assert.strictEqual(result.isValid, false);
    assert.match(result.error, /does not exist/i);
  });

  test('fails when target path is a file rather than a directory', () => {
    const filePath = path.resolve(__filename); // This test file itself
    const result = validateProjectPath(filePath);
    assert.strictEqual(result.isValid, false);
    assert.match(result.error, /is a file, not a directory/i);
  });

  test('succeeds and resolves absolute path when pointing to an existing directory', () => {
    const dirPath = path.resolve(__dirname, '..'); // project root
    const result = validateProjectPath(dirPath);
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.error, null);
    assert.strictEqual(path.isAbsolute(result.resolvedPath), true);
    assert.strictEqual(result.dirName, 'devops-automation-agent');
  });

  test('correctly handles relative paths like "."', () => {
    const result = validateProjectPath('.');
    assert.strictEqual(result.isValid, true);
    assert.strictEqual(result.error, null);
    assert.strictEqual(path.isAbsolute(result.resolvedPath), true);
  });
});
