const { test, describe, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const { app } = require('../server');

describe('DevOps Agent Express API Routes', () => {
  let serverInstance;
  let baseUrl;

  before(async () => {
    // Start server on an ephemeral port (0 selects any free port)
    await new Promise((resolve) => {
      serverInstance = app.listen(0, () => {
        const port = serverInstance.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (serverInstance) {
      await new Promise((resolve) => serverInstance.close(resolve));
    }
  });

  test('GET / returns welcome overview and endpoint docs', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.status, 'Running');
    assert.ok(json.docs.analyze);
  });

  test('GET /api/projects/health returns 200 and UP status', async () => {
    const res = await fetch(`${baseUrl}/api/projects/health`);
    assert.strictEqual(res.status, 200);

    const json = await res.json();
    assert.strictEqual(json.status, 'UP');
    assert.strictEqual(typeof json.uptimeSeconds, 'number');
  });

  test('POST /api/projects/analyze returns 400 when path is missing', async () => {
    const res = await fetch(`${baseUrl}/api/projects/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });

    assert.strictEqual(res.status, 400);
    const json = await res.json();
    assert.strictEqual(json.success, false);
    assert.match(json.error, /Project path is required/i);
  });

  test('POST /api/projects/analyze returns 200 and project model on valid path', async () => {
    const targetDir = path.resolve(__dirname, '..');

    const res = await fetch(`${baseUrl}/api/projects/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: targetDir, noAi: true }),
    });

    assert.strictEqual(res.status, 200);
    const json = await res.json();
    assert.strictEqual(json.success, true);
    assert.strictEqual(json.data.name, 'devops-automation-agent');
    assert.strictEqual(json.data.status, 'VALIDATED');
  });
});
