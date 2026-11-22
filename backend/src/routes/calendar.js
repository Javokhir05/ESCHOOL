const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth);

const MAX_SPAN_MS = 42 * 24 * 60 * 60 * 1000; // up to six weeks at a time

const courseSelect = { slug: true, category: true, titleUz: true, titleEn: true };
const courseView = (c) => ({
  id: c.slug,
  category: c.category.toLowerCase(),
  title: { uz: c.titleUz, en: c.titleEn },
});

// GET /api/calendar?from=ISO&to=ISO
// Students: classes and deadlines of courses that are published AND where their enrollment is approved.
// Teachers: classes and deadlines of their own courses.
router.get('/', async (req, res, next) => {
  try {
    const from = new Date(String(req.query.from ?? ''));
    const to = new Date(String(req.query.to ?? ''));
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from || to - from > MAX_SPAN_MS) {
      return res.status(400).json({ error: 'BAD_RANGE' });
    }

    const me = await prisma.user.findUnique({
      where: { id: req.auth.id },
      include: { student: true, teacher: true },
    });
    if (!me) return res.status(401).json({ error: 'INVALID_TOKEN' });

    let courseWhere;
    let studentId = null;
    if (me.role === 'STUDENT' && me.student) {
      studentId = me.student.id;
      courseWhere = { status: 'PUBLISHED', enrollments: { some: { studentId, status: 'ACTIVE' } } };
    } else if (me.role === 'TEACHER' && me.teacher) {
      courseWhere = { teacherId: me.teacher.id };
    } else {
      return res.status(403).json({ error: 'FORBIDDEN' });
    }

    const assignmentInclude = { course: { select: courseSelect } };
    if (studentId) assignmentInclude.submissions = { where: { studentId }, select: { id: true } };

    const [sessions, assignments] = await Promise.all([
      prisma.classSession.findMany({
        where: { course: courseWhere, startsAt: { gte: from, lt: to } },
        include: { course: { select: courseSelect } },
        orderBy: { startsAt: 'asc' },
        take: 500,
      }),
      prisma.assignment.findMany({
        where: { course: courseWhere, dueAt: { gte: from, lt: to } },
        include: assignmentInclude,
        orderBy: { dueAt: 'asc' },
        take: 500,
      }),
    ]);

    const events = [
      ...sessions.map((s) => ({
        kind: 'session',
        id: s.id,
        start: s.startsAt,
        end: s.endsAt,
        title: s.title,
        mode: s.mode.toLowerCase(),
        location: s.location,
        link: s.link,
        cancelled: s.cancelled,
        course: courseView(s.course),
      })),
      ...assignments.map((a) => ({
        kind: 'deadline',
        id: a.id,
        start: a.dueAt,
        end: null,
        title: a.title,
        done: Array.isArray(a.submissions) ? a.submissions.length > 0 : null,
        course: courseView(a.course),
      })),
    ].sort((x, y) => new Date(x.start) - new Date(y.start));

    res.json({ events });
  } catch (err) {
    next(err);
  }
});

module.exports = router;