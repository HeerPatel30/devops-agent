/**
 * Lightweight in-memory rate limiter middleware for Express.
 * Prevents API quota abuse and DoS without external dependencies (e.g. Redis).
 */
class RateLimiter {
  /**
   * @param {Object} [options={}]
   * @param {number} [options.windowMs=60000] - Window duration in milliseconds (default: 1 minute)
   * @param {number} [options.maxRequests=10] - Maximum requests allowed per window (default: 10 RPM)
   * @param {string} [options.message] - Custom error message
   */
  constructor({
    windowMs = 60 * 1000,
    maxRequests = 10,
    message = 'Too many requests. Rate limit is 10 requests per minute to protect API quota. Please try again shortly.',
  } = {}) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.message = message;
    /** @type {Map<string, number[]>} */
    this.clients = new Map();
  }

  /**
   * Express middleware handler.
   */
  middleware() {
    return (req, res, next) => {
      const clientIp = this._getClientIp(req);
      const now = Date.now();
      const windowStart = now - this.windowMs;

      // Retrieve and prune timestamps outside the active window
      let timestamps = this.clients.get(clientIp) || [];
      timestamps = timestamps.filter(time => time > windowStart);

      if (timestamps.length >= this.maxRequests) {
        const oldest = timestamps[0];
        const retryAfterSeconds = Math.ceil((oldest + this.windowMs - now) / 1000);

        res.setHeader('Retry-After', retryAfterSeconds);
        res.setHeader('X-RateLimit-Limit', this.maxRequests);
        res.setHeader('X-RateLimit-Remaining', 0);

        return res.status(429).json({
          success: false,
          error: this.message,
          retryAfterSeconds: Math.max(1, retryAfterSeconds),
        });
      }

      // Record this request
      timestamps.push(now);
      this.clients.set(clientIp, timestamps);

      res.setHeader('X-RateLimit-Limit', this.maxRequests);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, this.maxRequests - timestamps.length));

      next();
    };
  }

  /**
   * Resets all tracked clients (primarily for unit testing).
   */
  reset() {
    this.clients.clear();
  }

  /**
   * Extracts client IP address safely.
   * @private
   */
  _getClientIp(req) {
    return (
      (req.headers && req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
      req.ip ||
      (req.socket && req.socket.remoteAddress) ||
      '127.0.0.1'
    );
  }
}

// Default instance for application routes (10 requests per minute)
const defaultLimiter = new RateLimiter({ windowMs: 60 * 1000, maxRequests: 10 });

module.exports = {
  RateLimiter,
  rateLimiter: defaultLimiter.middleware(),
  defaultLimiter,
};
