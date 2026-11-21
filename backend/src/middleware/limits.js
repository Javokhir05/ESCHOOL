const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

// Works with older and newer versions of the package
const ipKey = (req) => (ipKeyGenerator ? ipKeyGenerator(req.ip) : req.ip);
const tooMany = (req, res) => res.status(429).json({ error: 'TOO_MANY_REQUESTS' });
const base = { standardHeaders: true, legacyHeaders: false, handler: tooMany };

// The whole API. Generous on purpose: a whole class can sit behind one school IP address.
const apiLimiter = rateLimit({ ...base, windowMs: 60 * 1000, limit: 1200, keyGenerator: ipKey });

// Wrong passwords: 8 failures per IP + email in 15 minutes. Successful logins are not counted.
const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 8,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKey(req)}|${String((req.body || {}).email ?? '').trim().toLowerCase().slice(0, 254)}`,
});

// Many different emails from one IP (someone trying a list of accounts)
const loginIpLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 100,
  skipSuccessfulRequests: true,
  keyGenerator: ipKey,
});

// New accounts: 60 per hour per IP (a computer lab may register many students at once)
const registerLimiter = rateLimit({ ...base, windowMs: 60 * 60 * 1000, limit: 60, keyGenerator: ipKey });

// Password changes: 5 attempts per 15 minutes per account (used after requireAuth, so req.auth exists)
const passwordLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.auth.id,
});

// Photo uploads: 10 per hour per account (used after requireAuth, so req.auth exists)
const avatarLimiter = rateLimit({
  ...base,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: (req) => req.auth.id,
});

module.exports = { apiLimiter, loginLimiter, loginIpLimiter, registerLimiter, passwordLimiter, avatarLimiter };