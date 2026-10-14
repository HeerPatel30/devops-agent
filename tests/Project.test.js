const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const Project = require('../src/models/Project');

describe('Project Model', () => {
  const sampleRoot = path.resolve(__dirname, '..');

  test('instantiates successfully with valid parameters', () => {
    const project = new Project({
      name: 'Sample App',
      rootPath: sampleRoot,
      status: 'VALIDATED',
    });

    assert.strictEqual(project.name, 'Sample App');
    assert.strictEqual(project.rootPath, sampleRoot);
    assert.strictEqual(project.status, 'VALIDATED');
    assert.ok(project.validatedAt instanceof Date);
    assert.deepStrictEqual(project.technologies, []);
  });

  test('auto-derives project name from directory basename if name is omitted', () => {
    const project = new Project({
      rootPath: sampleRoot,
    });

    assert.strictEqual(project.name, path.basename(sampleRoot));
  });

  test('throws an error if rootPath is missing', () => {
    assert.throws(
      () => {
        new Project({ name: 'Invalid Project' });
      },
      {
        message: /"rootPath" is required/i,
      }
    );
  });

  test('throws an error if rootPath is not an absolute path', () => {
    assert.throws(
      () => {
        new Project({ name: 'Relative App', rootPath: './relative/path' });
      },
      {
        message: /must be an absolute path/i,
      }
    );
  });

  test('serializes to clean JSON object with toJSON() and getSummary()', () => {
    const project = new Project({
      name: 'Test Project',
      rootPath: sampleRoot,
    });

    const json = project.toJSON();
    assert.strictEqual(json.name, 'Test Project');
    assert.strictEqual(json.rootPath, sampleRoot);
    assert.strictEqual(typeof json.validatedAt, 'string');
    assert.ok(Array.isArray(json.technologies));

    const summary = project.getSummary();
    assert.strictEqual(summary.name, 'Test Project');
    assert.strictEqual(summary.technologiesCount, 0);
  });
});
