const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const ProjectController = require('../src/controllers/ProjectController');

describe('ProjectController (MVC Coordination)', () => {
  const sampleRoot = path.resolve(__dirname, '..');

  test('successfully validates path, creates model, and renders report', () => {
    let renderedProject = null;
    let renderedOptions = null;

    const mockView = {
      renderReport(project, options) {
        renderedProject = project;
        renderedOptions = options;
      },
      renderError() {
        assert.fail('renderError should not have been called');
      },
    };

    const controller = new ProjectController({ view: mockView });
    const result = controller.analyze(sampleRoot, { format: 'terminal' });

    assert.strictEqual(result.success, true);
    assert.ok(result.project);
    assert.strictEqual(result.project.rootPath, sampleRoot);
    assert.strictEqual(renderedProject, result.project);
    assert.deepStrictEqual(renderedOptions, { format: 'terminal' });
  });

  test('handles missing or invalid path by rendering error and setting failure code', () => {
    let capturedError = null;

    const mockView = {
      renderReport() {
        assert.fail('renderReport should not have been called');
      },
      renderError(error) {
        capturedError = error;
      },
    };

    const controller = new ProjectController({ view: mockView });
    const result = controller.analyze('');

    assert.strictEqual(result.success, false);
    assert.match(result.error, /Project path is required/i);
    assert.strictEqual(capturedError, result.error);
    assert.strictEqual(process.exitCode, 1);

    // Reset exitCode for subsequent tests
    process.exitCode = 0;
  });

  test('renders help when showHelp() is invoked', () => {
    let helpRendered = false;

    const mockView = {
      renderHelp() {
        helpRendered = true;
      },
    };

    const controller = new ProjectController({ view: mockView });
    controller.showHelp();

    assert.strictEqual(helpRendered, true);
  });
});
