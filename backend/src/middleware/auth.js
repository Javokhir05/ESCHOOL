const jwt = require('jsonwebtoken');

// Reads "Authorization: Bearer <token>" and puts { id, role } on req.auth
function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'UNAUTHENTICATED' });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = { id: payload.sub, role: payload.role };
    next();
  } catch {
    res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

// Usage: requireRole('ADMIN') or requireRole('TEACHER', 'ADMIN')
function requireRole(...roles) {
  return (req, res, next) =>
    roles.includes(req.auth.role) ? next() : res.status(403).json({ error: 'FORBIDDEN' });
}

module.exports = { requireAuth, requireRole };