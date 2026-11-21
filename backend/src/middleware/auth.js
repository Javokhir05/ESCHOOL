const jwt = require('jsonwebtoken');
const prisma = require('../db');

// Reads "Authorization: Bearer <token>", then checks the account in the database on EVERY request.
// So a disabled account, a changed role or a changed password takes effect immediately.
// req.auth.role comes from the database, never from the token.
async function authenticate(req, res, next, allowPasswordChange) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
  if (typeof payload.sub !== 'string') return res.status(401).json({ error: 'INVALID_TOKEN' });

  let user;
  try {
    user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true, tokenVersion: true, mustChangePassword: true },
    });
  } catch (err) {
    return next(err);
  }

  // Tokens made before the version existed count as version 0
  if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== (payload.v ?? 0)) {
    return res.status(401).json({ error: 'INVALID_TOKEN' });
  }
  // After an admin sets a temporary password, the account may only choose a new one
  if (user.mustChangePassword && !allowPasswordChange) {
    return res.status(403).json({ error: 'PASSWORD_CHANGE_REQUIRED' });
  }

  req.auth = { id: user.id, role: user.role };
  next();
}

const requireAuth = (req, res, next) => authenticate(req, res, next, false);
// Only for "who am I" and "change my password"
const requireAuthAllowReset = (req, res, next) => authenticate(req, res, next, true);

// Usage: requireRole('ADMIN') or requireRole('TEACHER', 'ADMIN')
function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.auth.role) ? next() : res.status(403).json({ error: 'FORBIDDEN' });
}

module.exports = { requireAuth, requireAuthAllowReset, requireRole };