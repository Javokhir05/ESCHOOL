const jwt = require('jsonwebtoken');
const prisma = require('../db');

// Reads "Authorization: Bearer <token>", then checks the account in the database on EVERY request.
// So a disabled account, a changed role or a changed password takes effect immediately.
// req.auth.role comes from the database, never from the token.
async function requireAuth(req, res, next) {
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

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true, tokenVersion: true },
    });
    // Tokens made before the version existed count as version 0
    if (!user || user.status !== 'ACTIVE' || user.tokenVersion !== (payload.v ?? 0)) {
      return res.status(401).json({ error: 'INVALID_TOKEN' });
    }
    req.auth = { id: user.id, role: user.role };
    next();
  } catch (err) {
    next(err);
  }
}

// Usage: requireRole('ADMIN') or requireRole('TEACHER', 'ADMIN')
function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.auth.role) ? next() : res.status(403).json({ error: 'FORBIDDEN' });
}

module.exports = { requireAuth, requireRole };