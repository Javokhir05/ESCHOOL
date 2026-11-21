const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

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

// ---------- Users, students, courses and reports ----------

const PAGE_SIZE = 20;
const ROLES = ['STUDENT', 'TEACHER', 'ADMIN'];
const STATUSES = ['ACTIVE', 'PENDING', 'DISABLED'];

function pageOf(req) {
  const n = Number.parseInt(req.query.page, 10);
  return Number.isInteger(n) && n >= 1 && n <= 10000 ? n : 1;
}
const searchOf = (req) => String(req.query.q ?? '').trim().slice(0, 100);
const nameOrEmail = (q) => [
  { fullName: { contains: q, mode: 'insensitive' } },
  { email: { contains: q, mode: 'insensitive' } },
];

// No look-alike characters (0/O, 1/l/I), so the password can be read out loud over the phone
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function tempPassword(length = 12) {
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  return out;
}

// GET /api/admin/users?q=&role=&status=&page=
router.get('/users', async (req, res, next) => {
  try {
    const q = searchOf(req);
    const where = {};
    if (ROLES.includes(req.query.role)) where.role = req.query.role;
    if (STATUSES.includes(req.query.status)) where.status = req.query.status;
    if (q) where.OR = nameOrEmail(q);

    const page = pageOf(req);
    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        // an explicit list, so the password hash can never leave the server
        select: {
          id: true, fullName: true, email: true, phone: true, role: true,
          status: true, createdAt: true, mustChangePassword: true,
        },
      }),
    ]);
    res.json({ users, total, page, pageSize: PAGE_SIZE });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/users/:id/status   body: { status: 'ACTIVE' | 'DISABLED' }  (students and teachers only)
router.patch('/users/:id/status', async (req, res, next) => {
  try {
    const status = (req.body || {}).status;
    if (!['ACTIVE', 'DISABLED'].includes(status)) return res.status(400).json({ error: 'VALIDATION' });

    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role === 'ADMIN') return res.status(404).json({ error: 'NOT_FOUND' });

    await prisma.user.update({
      where: { id: user.id },
      // disabling also kills old tokens, so enabling the account again never revives an old session
      data: { status, ...(status === 'DISABLED' && { tokenVersion: { increment: 1 } }) },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/admin/users/:id/temp-password  (students and teachers only; the password is shown once)
router.post('/users/:id/temp-password', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!user || user.role === 'ADMIN') return res.status(404).json({ error: 'NOT_FOUND' });

    const password = tempPassword();
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(password, 12),
        mustChangePassword: true,
        tokenVersion: { increment: 1 }, // signs the user out everywhere
      },
    });
    res.set('Cache-Control', 'no-store');
    res.json({ password });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/students?q=&page=
router.get('/students', async (req, res, next) => {
  try {
    const q = searchOf(req);
    const where = q ? { user: { OR: nameOrEmail(q) } } : {};
    const page = pageOf(req);

    const [total, rows] = await Promise.all([
      prisma.studentProfile.count({ where }),
      prisma.studentProfile.findMany({
        where,
        orderBy: [{ user: { fullName: 'asc' } }, { id: 'asc' }],
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: {
          user: { select: { fullName: true, email: true, phone: true, status: true } },
          enrollments: {
            where: { status: { in: ['ACTIVE', 'PENDING'] } },
            include: { course: { select: { titleUz: true, titleEn: true } } },
          },
        },
      }),
    ]);

    const ids = rows.map((r) => r.id);
    const [lessons, submissions, attempts] = ids.length
      ? await Promise.all([
          prisma.lessonProgress.groupBy({ by: ['studentId'], where: { studentId: { in: ids } }, _count: { _all: true } }),
          prisma.submission.groupBy({ by: ['studentId'], where: { studentId: { in: ids } }, _count: { _all: true } }),
          prisma.attempt.groupBy({
            by: ['studentId'],
            where: { studentId: { in: ids }, finishedAt: { not: null } },
            _count: { _all: true },
          }),
        ])
      : [[], [], []];
    const toMap = (list) => new Map(list.map((r) => [r.studentId, r._count._all]));
    const lessonMap = toMap(lessons);
    const submissionMap = toMap(submissions);
    const attemptMap = toMap(attempts);

    res.json({
      students: rows.map((s) => ({
        id: s.id,
        fullName: s.user.fullName,
        email: s.user.email,
        phone: s.user.phone,
        status: s.user.status,
        grade: s.grade,
        courses: s.enrollments.map((e) => ({
          id: e.id,
          status: e.status,
          title: { uz: e.course.titleUz, en: e.course.titleEn },
        })),
        lessonsCompleted: lessonMap.get(s.id) || 0,
        submissions: submissionMap.get(s.id) || 0,
        testsTaken: attemptMap.get(s.id) || 0,
      })),
      total,
      page,
      pageSize: PAGE_SIZE,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/courses  (every course, including drafts)
router.get('/courses', async (req, res, next) => {
  try {
    const rows = await prisma.course.findMany({
      include: {
        teacher: { include: { user: { select: { fullName: true, status: true } } } },
        enrollments: { select: { status: true } },
        _count: { select: { lessons: true, assignments: true, tests: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
    res.json({
      courses: rows.map((c) => ({
        id: c.id,
        slug: c.slug,
        status: c.status,
        category: c.category.toLowerCase(),
        level: c.level.toLowerCase(),
        title: { uz: c.titleUz, en: c.titleEn },
        teacher: { fullName: c.teacher.user.fullName, active: c.teacher.user.status === 'ACTIVE' },
        activeStudents: c.enrollments.filter((e) => e.status === 'ACTIVE').length,
        pendingRequests: c.enrollments.filter((e) => e.status === 'PENDING').length,
        lessonCount: c._count.lessons,
        assignmentCount: c._count.assignments,
        testCount: c._count.tests,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/admin/courses/:id/status   body: { status: 'DRAFT' | 'PUBLISHED' }
router.patch('/courses/:id/status', async (req, res, next) => {
  try {
    const status = (req.body || {}).status;
    if (!['DRAFT', 'PUBLISHED'].includes(status)) return res.status(400).json({ error: 'VALIDATION' });

    const course = await prisma.course.findUnique({ where: { id: req.params.id } });
    if (!course) return res.status(404).json({ error: 'NOT_FOUND' });

    await prisma.course.update({ where: { id: course.id }, data: { status } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/admin/reports?days=7|30|90
router.get('/reports', async (req, res, next) => {
  try {
    const requested = Number.parseInt(req.query.days, 10);
    const days = [7, 30, 90].includes(requested) ? requested : 30;
    const DAY = 24 * 60 * 60 * 1000;
    const since = new Date(Date.now() - days * DAY);
    const weekAgo = new Date(Date.now() - 7 * DAY);
    const inPeriod = (field) => ({ [field]: { gte: since } });

    const [
      newStudents, requests, lessons, submitted, graded, tests, testSums, verified,
      students, teachers, courses, enrollments,
      pendingTeachers, pendingEnrollments, pendingAchievements, oldSubmissions, top,
    ] = await Promise.all([
      prisma.user.count({ where: { role: 'STUDENT', ...inPeriod('createdAt') } }),
      prisma.enrollment.count({ where: inPeriod('createdAt') }),
      prisma.lessonProgress.count({ where: inPeriod('completedAt') }),
      prisma.submission.count({ where: inPeriod('submittedAt') }),
      prisma.submission.count({ where: inPeriod('gradedAt') }),
      prisma.attempt.count({ where: inPeriod('finishedAt') }),
      prisma.attempt.aggregate({ where: { ...inPeriod('finishedAt'), total: { gt: 0 } }, _sum: { score: true, total: true } }),
      prisma.achievement.count({ where: inPeriod('verifiedAt') }),

      prisma.user.count({ where: { role: 'STUDENT', status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'TEACHER', status: 'ACTIVE' } }),
      prisma.course.count({ where: { status: 'PUBLISHED' } }),
      prisma.enrollment.count({ where: { status: 'ACTIVE' } }),

      prisma.user.count({ where: { role: 'TEACHER', status: 'PENDING' } }),
      prisma.enrollment.count({ where: { status: 'PENDING' } }),
      prisma.achievement.count({ where: { status: 'PENDING' } }),
      prisma.submission.count({ where: { status: 'SUBMITTED', submittedAt: { lt: weekAgo } } }),
      prisma.enrollment.groupBy({
        by: ['courseId'],
        where: { status: 'ACTIVE', course: { status: 'PUBLISHED' } },
        _count: { courseId: true },
        orderBy: { _count: { courseId: 'desc' } },
        take: 5,
      }),
    ]);

    const topCourses = top.length
      ? await prisma.course.findMany({
          where: { id: { in: top.map((r) => r.courseId) } },
          select: { id: true, slug: true, titleUz: true, titleEn: true },
        })
      : [];
    const byId = new Map(topCourses.map((c) => [c.id, c]));

    const sum = testSums._sum;
    res.json({
      days,
      period: {
        newStudents,
        enrollmentRequests: requests,
        lessonsCompleted: lessons,
        submissions: submitted,
        graded,
        testsFinished: tests,
        testPercent: sum.total ? Math.round((sum.score / sum.total) * 100) : null,
        achievementsVerified: verified,
      },
      totals: { students, teachers, courses, enrollments },
      attention: { pendingTeachers, pendingEnrollments, pendingAchievements, oldSubmissions },
      topCourses: top
        .filter((r) => byId.has(r.courseId))
        .map((r) => {
          const c = byId.get(r.courseId);
          return { id: c.slug, title: { uz: c.titleUz, en: c.titleEn }, students: r._count.courseId };
        }),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;