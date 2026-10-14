const { test, describe } = require('node:test');
const assert = require('node:assert');
const GeminiService = require('../src/services/GeminiService');

describe('GeminiService', () => {
  test('correctly identifies when API key is missing or configured', () => {
    const unconfigured = new GeminiService({ apiKey: '' });
    assert.strictEqual(unconfigured.isConfigured(), false);

    const configured = new GeminiService({ apiKey: 'AIzaFakeTestKey123' });
    assert.strictEqual(configured.isConfigured(), true);
    assert.strictEqual(configured.model, 'gemini-2.5-flash');
  });

  test('returns error gracefully if generateDevOpsAssessment is called without API key', async () => {
    const service = new GeminiService({ apiKey: null });
    const result = await service.generateDevOpsAssessment({
      name: 'test-app',
      rootPath: 'C:\\fake',
      files: ['package.json'],
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.configured, false);
    assert.match(result.error, /GEMINI_API_KEY is not configured/i);
  });

  test('successfully parses Gemini response with injected mock fetchClient', async () => {
    const mockApiResponse = {
      candidates: [
        {
          content: {
            parts: [
              {
                text: 'This is a Node.js repository. Recommended CI/CD: Azure Pipelines with Docker container build.',
              },
            ],
          },
        },
      ],
    };

    const mockFetch = async (url, options) => {
      assert.ok(url.includes('gemini-2.5-flash'));
      assert.ok(url.includes('AIzaFakeTestKey'));
      assert.strictEqual(options.method, 'POST');
      return {
        ok: true,
        status: 200,
        json: async () => mockApiResponse,
      };
    };

    const service = new GeminiService({
      apiKey: 'AIzaFakeTestKey',
      model: 'gemini-2.5-flash',
      fetchClient: mockFetch,
    });

    const result = await service.generateDevOpsAssessment({
      name: 'my-node-app',
      rootPath: 'C:\\projects\\my-node-app',
      files: ['package.json', 'Dockerfile'],
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.model, 'gemini-2.5-flash');
    assert.match(result.assessment, /This is a Node\.js repository/);
  });

  test('gracefully handles API error responses from Google endpoint', async () => {
    const mockFetch = async () => ({
      ok: false,
      status: 400,
      json: async () => ({
        error: {
          code: 400,
          message: 'API key not valid. Please pass a valid API key.',
          status: 'INVALID_ARGUMENT',
        },
      }),
    });

    const service = new GeminiService({
      apiKey: 'InvalidKey',
      fetchClient: mockFetch,
    });

    const result = await service.generateDevOpsAssessment({
      name: 'my-app',
      rootPath: 'C:\\app',
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.configured, true);
    assert.match(result.error, /API key not valid/i);
  });
});
