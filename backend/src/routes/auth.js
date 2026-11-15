const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const GOALS = { ielts: 'IELTS', cefr: 'CEFR', academic: 'ACADEMIC' };

// Accepts 901234567 or +998901234567 and returns +998901234567 (or null)
function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`;
  return null;
}

function publicUser(user) {
  const { passwordHash, ...safe } = user; // never send the hash out
  return safe;
}

// POST /api/auth/register
router.post('/register', async (req, res, next) => {
  try {
    const b = req.body || {};
    const errors = {};

    const role = b.role === 'teacher' ? 'TEACHER' : b.role === 'student' ? 'STUDENT' : null;
    if (!role) errors.role = 'required'; // admins can never be created here

    const fullName = String(b.fullName || '').trim();
    if (fullName.length < 3) errors.fullName = 'name';

    const email = String(b.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) errors.email = 'email';

    const phone = normalizePhone(b.phone);
    if (!phone) errors.phone = 'phone';

    const password = String(b.password || '');
    if (password.length < 8 || password.length > 72) errors.password = 'password';

    let grade = null;
    let goal = null;
    let subject = null;
    let experienceYears = null;

    if (role === 'STUDENT') {
      grade = Number(b.grade);
      if (!Number.isInteger(grade) || grade < 5 || grade > 11) errors.grade = 'required';
      goal = GOALS[b.goal] || null; // "not sure" and empty both mean null
    }
    if (role === 'TEACHER') {
      subject = GOALS[b.subject] || null;
      if (!subject) errors.subject = 'required';
      experienceYears = Number(b.experience);
      if (!Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) {
        errors.experience = 'experience';
      }
    }

    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: 'EMAIL_TAKEN' });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email, phone, fullName, passwordHash, role,
        status: role === 'TEACHER' ? 'PENDING' : 'ACTIVE',
        ...(role === 'STUDENT' && { student: { create: { grade, goal } } }),
        ...(role === 'TEACHER' && { teacher: { create: { subject, experienceYears } } }),
      },
    });

    res.status(201).json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const email = String((req.body || {}).email || '').trim().toLowerCase();
    const password = String((req.body || {}).password || '');

    const user = await prisma.user.findUnique({ where: { email } });
    // Same answer for "no such email" and "wrong password", so nobody can probe which emails exist
    const ok = user && (await bcrypt.compare(password, user.passwordHash));
    if (!ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

    if (user.status === 'PENDING') return res.status(403).json({ error: 'ACCOUNT_PENDING' });
    if (user.status === 'DISABLED') return res.status(403).json({ error: 'ACCOUNT_DISABLED' });

    const token = jwt.sign({ role: user.role }, process.env.JWT_SECRET, {
      subject: user.id,
      expiresIn: '7d',
    });

    res.json({ token, user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  (needs a valid token)
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.id },
      include: { student: true, teacher: true },
    });
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ error: 'INVALID_TOKEN' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;