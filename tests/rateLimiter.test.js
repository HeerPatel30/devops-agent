const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert');
const { RateLimiter } = require('../src/utils/rateLimiter');

describe('RateLimiter Utility', () => {
  let limiter;

  beforeEach(() => {
    limiter = new RateLimiter({ windowMs: 1000, maxRequests: 2 });
  });

  test('allows requests within limit', () => {
    const middleware = limiter.middleware();
    let nextCalled = 0;

    const req = { ip: '192.168.1.1', headers: {}, socket: {} };
    const res = { setHeader: () => {} };
    const next = () => { nextCalled++; };

    middleware(req, res, next);
    middleware(req, res, next);

    assert.strictEqual(nextCalled, 2);
  });

  test('blocks requests exceeding limit with 429 status', () => {
    const middleware = limiter.middleware();
    let nextCalled = 0;
    let blockedStatus = null;
    let responseData = null;

    const req = { ip: '10.0.0.1', headers: {}, socket: {} };
    const res = {
      setHeader: () => {},
      status: (code) => {
        blockedStatus = code;
        return {
          json: (data) => {
            responseData = data;
          },
        };
      },
    };
    const next = () => { nextCalled++; };

    // Request 1 and 2 (allowed)
    middleware(req, res, next);
    middleware(req, res, next);
    assert.strictEqual(nextCalled, 2);

    // Request 3 (blocked)
    middleware(req, res, next);
    assert.strictEqual(nextCalled, 2);
    assert.strictEqual(blockedStatus, 429);
    assert.strictEqual(responseData.success, false);
    assert.match(responseData.error, /Rate limit is/i);
    assert.ok(responseData.retryAfterSeconds > 0);
  });

  test('differentiates between distinct IP addresses', () => {
    const middleware = limiter.middleware();
    let nextCalled = 0;

    const reqA = { ip: '1.1.1.1', headers: {}, socket: {} };
    const reqB = { ip: '2.2.2.2', headers: {}, socket: {} };
    const res = { setHeader: () => {} };
    const next = () => { nextCalled++; };

    middleware(reqA, res, next);
    middleware(reqA, res, next);
    middleware(reqB, res, next);
    middleware(reqB, res, next);

    assert.strictEqual(nextCalled, 4);
  });
});
