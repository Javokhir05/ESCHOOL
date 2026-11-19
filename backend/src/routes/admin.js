const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every route here needs a valid token AND an admin account that is still active in the database.
// Checking the database (not only the token) means a demoted or disabled admin loses access at once.
router.use(requireAuth, async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.auth.id },
      select: { role: true, status: true },
    });
    if (!me || me.status !== 'ACTIVE') return res.status(401).json({ error: 'INVALID_TOKEN' });
    if (me.role !== 'ADMIN') return res.status(403).json({ error: 'FORBIDDEN' });
    next();
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/stats
router.get('/stats', async (req, res, next) => {
  try {
    const [pendingTeachers, pendingEnrollments, students, teachers, courses, pendingAchievements] = await Promise.all([
      prisma.user.count({ where: { role: 'TEACHER', status: 'PENDING' } }),
      prisma.enrollment.count({ where: { status: 'PENDING' } }),
      prisma.user.count({ where: { role: 'STUDENT' } }),
      prisma.user.count({ where: { role: 'TEACHER', status: 'ACTIVE' } }),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.achievement.count({ where: { status: 'PENDING' } }),
    ]);
    res.json({ stats: { pendingTeachers, pendingEnrollments, students, teachers, courses, pendingAchievements } });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/teachers  (waiting accounts first)
router.get('/teachers', async (req, res, next) => {
  try {
    const rows = await prisma.user.findMany({
      where: { role: 'TEACHER' },
      include: { teacher: true },
      orderBy: { createdAt: 'desc' },
    });
    const order = { PENDING: 0, ACTIVE: 1, DISABLED: 2 };
    rows.sort((a, b) => order[a.status] - order[b.status]);

    res.json({
      teachers: rows.map((u) => ({
        id: u.id,
        fullName: u.fullName,
        email: u.email,
        phone: u.phone,
        status: u.status,
        createdAt: u.createdAt,
        subject: u.teacher ? u.teacher.subject.toLowerCase() : null,
        experienceYears: u.teacher ? u.teacher.experienceYears : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/teachers/:id/status   body: { status: 'ACTIVE' | 'DISABLED' }
router.patch('/teachers/:id/status', async (req, res, next) => {
  try {
    const status = (req.body || {}).status;
    if (!['ACTIVE', 'DISABLED'].includes(status)) return res.status(400).json({ error: 'VALIDATION' });

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    // Only teacher accounts can be changed here, never another admin
    if (!user || user.role !== 'TEACHER') return res.status(404).json({ error: 'NOT_FOUND' });

    await prisma.user.update({ where: { id: user.id }, data: { status } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/enrollments?status=PENDING|ALL
router.get('/enrollments', async (req, res, next) => {
  try {
    const where = req.query.status === 'ALL' ? {} : { status: 'PENDING' };
    const rows = await prisma.enrollment.findMany({
      where,
      include: {
        course: true,
        student: { include: { user: { select: { fullName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    res.json({
      enrollments: rows.map((e) => ({
        id: e.id,
        status: e.status,
        createdAt: e.createdAt,
        student: { fullName: e.student.user.fullName, email: e.student.user.email, grade: e.student.grade },
        course: { id: e.course.slug, title: { uz: e.course.titleUz, en: e.course.titleEn } },
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/enrollments/:id   body: { status: 'ACTIVE' | 'REJECTED' }
router.patch('/enrollments/:id', async (req, res, next) => {
  try {
    const status = (req.body || {}).status;
    if (!['ACTIVE', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'VALIDATION' });

    const found = await prisma.enrollment.findUnique({ where: { id: req.params.id } });
    if (!found) return res.status(404).json({ error: 'NOT_FOUND' });

    await prisma.enrollment.update({ where: { id: found.id }, data: { status } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/achievements?status=PENDING|ALL
router.get('/achievements', async (req, res, next) => {
  try {
    const where = req.query.status === 'ALL' ? {} : { status: 'PENDING' };
    const rows = await prisma.achievement.findMany({
      where,
      include: { student: { include: { user: { select: { fullName: true, email: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    res.json({
      achievements: rows.map((a) => ({
        id: a.id,
        version: a.updatedAt, // sent back with the decision, see below
        type: a.type.toLowerCase(),
        title: a.title,
        result: a.result,
        issuedOn: a.issuedOn,
        status: a.status,
        rejectReason: a.rejectReason,
        showPublic: a.showPublic,
        file: a.fileStored ? { name: a.fileName, size: a.fileSize } : null,
        student: { fullName: a.student.user.fullName, email: a.student.user.email, grade: a.student.grade },
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/achievements/:id   body: { status: 'VERIFIED' | 'REJECTED', reason, version }
// "version" is the updatedAt value the admin saw. If the student changed the entry meanwhile, nothing is saved.
router.patch('/achievements/:id', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!['VERIFIED', 'REJECTED'].includes(b.status)) return res.status(400).json({ error: 'VALIDATION' });

    const version = new Date(b.version);
    if (Number.isNaN(version.getTime())) return res.status(400).json({ error: 'VALIDATION' });

    let rejectReason = null;
    if (b.status === 'REJECTED') {
      rejectReason = String(b.reason ?? '').trim();
      if (rejectReason.length < 3 || rejectReason.length > 300) {
        return res.status(400).json({ error: 'VALIDATION', fields: { reason: 'reason' } });
      }
    }

    const found = await prisma.achievement.findUnique({ where: { id: req.params.id } });
    if (!found) return res.status(404).json({ error: 'NOT_FOUND' });

    const result = await prisma.achievement.updateMany({
      where: { id: found.id, updatedAt: version },
      data: { status: b.status, rejectReason, verifiedAt: b.status === 'VERIFIED' ? new Date() : null },
    });
    if (result.count === 0) return res.status(409).json({ error: 'CHANGED' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;