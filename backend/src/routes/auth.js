const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { requireAuthAllowReset } = require('../middleware/auth');
const { loginLimiter, loginIpLimiter, registerLimiter, passwordLimiter } = require('../middleware/limits');
const { validatePassword } = require('../password');
const { normalizePhone } = require('../phone');

const router = express.Router();

const GOALS = { ielts: 'IELTS', cefr: 'CEFR', academic: 'ACADEMIC' };

// Compared against when the email does not exist, so a login takes the same time either way
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12);



function publicUser(user) {
  const { passwordHash, tokenVersion, ...safe } = user; // never send these out
  return safe;
}

function signToken(user) {
  return jwt.sign({ role: user.role, v: user.tokenVersion }, process.env.JWT_SECRET, {
    subject: user.id,
    expiresIn: '7d',
    algorithm: 'HS256',
  });
}

// POST /api/auth/register
router.post('/register', registerLimiter, async (req, res, next) => {
  try {
    const b = req.body || {};
    const errors = {};

    const role = b.role === 'teacher' ? 'TEACHER' : b.role === 'student' ? 'STUDENT' : null;
    if (!role) errors.role = 'required'; // admins can never be created here

    const fullName = String(b.fullName || '').trim();
    if (fullName.length < 3) errors.fullName = 'name';

    const email = String(b.email || '').trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || email.length > 254) errors.email = 'email';

    const phone = normalizePhone(b.phone);
    if (!phone) errors.phone = 'phone';

    const password = String(b.password || '');
    const passwordProblem = validatePassword(password, email);
    if (passwordProblem) errors.password = passwordProblem;

    let grade = null;
    let goal = null;
    let subject = null;
    let experienceYears = null;

    if (role === 'STUDENT') {
      grade = Number(b.grade);
      if (!Number.isInteger(grade) || grade < 5 || grade > 11) errors.grade = 'required';
      goal = Object.hasOwn(GOALS, b.goal) ? GOALS[b.goal] : null; // "not sure" and empty both mean null
    }
    if (role === 'TEACHER') {
      subject = Object.hasOwn(GOALS, b.subject) ? GOALS[b.subject] : null;
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
router.post('/login', loginIpLimiter, loginLimiter, async (req, res, next) => {
  try {
    const email = String((req.body || {}).email ?? '').trim().toLowerCase();
    const password = String((req.body || {}).password ?? '');

        const user = await prisma.user.findUnique({ where: { email }, include: { student: true, teacher: true } });
    // The password is always compared, even for an unknown email. Same answer, same time.
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok) return res.status(401).json({ error: 'INVALID_CREDENTIALS' });

    // These two answers are given only after the password was right
    if (user.status === 'PENDING') return res.status(403).json({ error: 'ACCOUNT_PENDING' });
    if (user.status === 'DISABLED') return res.status(403).json({ error: 'ACCOUNT_DISABLED' });

    res.json({ token: signToken(user), user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me  (needs a valid token)
router.get('/me', requireAuthAllowReset, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.id },
      include: { student: true, teacher: true },
    });
    if (!user) return res.status(401).json({ error: 'INVALID_TOKEN' });
    res.json({ user: publicUser(user) });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/change-password   body: { currentPassword, newPassword }
// Signs out every other device (old tokens stop working) and returns a fresh token for this one.
router.post('/change-password', requireAuthAllowReset, passwordLimiter, async (req, res, next) => {
  try {
    const b = req.body || {};
    const currentPassword = String(b.currentPassword ?? '');
    const newPassword = String(b.newPassword ?? '');

    const user = await prisma.user.findUnique({ where: { id: req.auth.id } });
    if (!user) return res.status(401).json({ error: 'INVALID_TOKEN' });

    if (!(await bcrypt.compare(currentPassword, user.passwordHash))) {
      return res.status(400).json({ error: 'VALIDATION', fields: { currentPassword: 'wrongPassword' } });
    }
    const problem = validatePassword(newPassword, user.email);
    if (problem) return res.status(400).json({ error: 'VALIDATION', fields: { newPassword: problem } });
    if (newPassword === currentPassword) {
      return res.status(400).json({ error: 'VALIDATION', fields: { newPassword: 'same' } });
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
            data: {
        passwordHash: await bcrypt.hash(newPassword, 12),
        tokenVersion: { increment: 1 },
        mustChangePassword: false,
      },
    });
    res.json({ token: signToken(updated) });
  } catch (err) {
    next(err);
  }
});

module.exports = router;