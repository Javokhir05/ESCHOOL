const crypto = require('crypto');
const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every route here needs a valid token AND a teacher account that is active in the database.
router.use(requireAuth, async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.auth.id }, include: { teacher: true } });
    if (!me || me.status !== 'ACTIVE') return res.status(401).json({ error: 'INVALID_TOKEN' });
    if (me.role !== 'TEACHER' || !me.teacher) return res.status(403).json({ error: 'FORBIDDEN' });
    req.teacher = me.teacher;
    next();
  } catch (err) {
    next(err);
  }
});

const CATEGORIES = ['IELTS', 'CEFR', 'ACADEMIC'];
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'SCHOOL'];
const FORMATS = ['ONLINE', 'OFFLINE', 'BOTH'];

const TEXT_RULES = {
  titleUz: [3, 100], titleEn: [3, 100],
  summaryUz: [10, 300], summaryEn: [10, 300],
  durationUz: [1, 60], durationEn: [1, 60],
  scheduleUz: [1, 100], scheduleEn: [1, 100],
};

// Checks the whole course form. Returns { errors, data } where data is ready for Prisma.
function parseCourse(b = {}) {
  const errors = {};
  const data = {};
  const pick = (value, allowed) => {
    const v = String(value || '').toUpperCase();
    return allowed.includes(v) ? v : null;
  };

  data.category = pick(b.category, CATEGORIES);
  data.level = pick(b.level, LEVELS);
  data.format = pick(b.format, FORMATS);
  if (!data.category) errors.category = 'required';
  if (!data.level) errors.level = 'required';
  if (!data.format) errors.format = 'required';

  for (const [key, [min, max]] of Object.entries(TEXT_RULES)) {
    const v = String(b[key] ?? '').trim();
    if (v.length < min) errors[key] = 'required';
    else if (v.length > max) errors[key] = 'length';
    data[key] = v;
  }

  // A list is [{ uz, en }, ...]: both languages filled, each line under 200 characters
  const list = (value, maxItems) => {
    if (!Array.isArray(value) || value.length < 1 || value.length > maxItems) return null;
    const out = [];
    for (const item of value) {
      const uz = String(item?.uz ?? '').trim();
      const en = String(item?.en ?? '').trim();
      if (!uz || !en || uz.length > 200 || en.length > 200) return null;
      out.push({ uz, en });
    }
    return out;
  };
  data.outcomes = list(b.outcomes, 8);
  data.curriculum = list(b.curriculum, 12);
  if (!data.outcomes) errors.outcomes = 'list';
  if (!data.curriculum) errors.curriculum = 'list';

  return { errors, data };
}

function slugify(text) {
  return (
    text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50) || 'course'
  );
}

async function uniqueSlug(base) {
  let slug = base;
  for (let i = 0; i < 5; i++) {
    if (!(await prisma.course.findUnique({ where: { slug } }))) return slug;
    slug = `${base}-${crypto.randomBytes(2).toString('hex')}`;
  }
  return `${base}-${crypto.randomBytes(6).toString('hex')}`;
}

// A teacher can only touch their own courses. Someone else's course answers "not found".
async function ownCourse(req, res) {
  const course = await prisma.course.findUnique({ where: { id: req.params.id } });
  if (!course || course.teacherId !== req.teacher.id) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return null;
  }
  return course;
}

const lower = (v) => v.toLowerCase();

// GET /api/teacher/stats
router.get('/stats', async (req, res, next) => {
  try {
    const teacherId = req.teacher.id;
    const [activeRows, published, drafts, waiting] = await Promise.all([
      prisma.enrollment.findMany({
        where: { status: 'ACTIVE', course: { teacherId } },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
      prisma.course.count({ where: { teacherId, status: 'PUBLISHED' } }),
      prisma.course.count({ where: { teacherId, status: 'DRAFT' } }),
      prisma.enrollment.count({ where: { status: 'PENDING', course: { teacherId } } }),
    ]);
    res.json({ stats: { students: activeRows.length, published, drafts, waiting } });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/courses
router.get('/courses', async (req, res, next) => {
  try {
    const rows = await prisma.course.findMany({
      where: { teacherId: req.teacher.id },
      include: { enrollments: { select: { status: true } }, _count: { select: { lessons: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      courses: rows.map((c) => ({
        id: c.id,
        slug: c.slug,
        status: c.status,
        category: lower(c.category),
        level: lower(c.level),
        format: lower(c.format),
        title: { uz: c.titleUz, en: c.titleEn },
        activeStudents: c.enrollments.filter((e) => e.status === 'ACTIVE').length,
        pendingRequests: c.enrollments.filter((e) => e.status === 'PENDING').length,
        lessonCount: c._count.lessons,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/teacher/courses  (always created as a draft)
router.post('/courses', async (req, res, next) => {
  try {
    const { errors, data } = parseCourse(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    const slug = await uniqueSlug(slugify(data.titleEn));
    const course = await prisma.course.create({
      data: { ...data, slug, status: 'DRAFT', teacherId: req.teacher.id },
    });
    res.status(201).json({ course: { id: course.id, slug: course.slug } });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/courses/:id  (all fields, for the edit form)
router.get('/courses/:id', async (req, res, next) => {
  try {
    const c = await ownCourse(req, res);
    if (!c) return;
    res.json({
      course: {
        id: c.id, slug: c.slug, status: c.status,
        category: lower(c.category), level: lower(c.level), format: lower(c.format),
        titleUz: c.titleUz, titleEn: c.titleEn,
        summaryUz: c.summaryUz, summaryEn: c.summaryEn,
        durationUz: c.durationUz, durationEn: c.durationEn,
        scheduleUz: c.scheduleUz, scheduleEn: c.scheduleEn,
        outcomes: c.outcomes, curriculum: c.curriculum,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teacher/courses/:id
router.put('/courses/:id', async (req, res, next) => {
  try {
    const c = await ownCourse(req, res);
    if (!c) return;
    const { errors, data } = parseCourse(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    await prisma.course.update({ where: { id: c.id }, data }); // slug and status stay as they are
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/teacher/courses/:id/status   body: { status: 'DRAFT' | 'PUBLISHED' }
router.patch('/courses/:id/status', async (req, res, next) => {
  try {
    const c = await ownCourse(req, res);
    if (!c) return;
    const status = (req.body || {}).status;
    if (!['DRAFT', 'PUBLISHED'].includes(status)) return res.status(400).json({ error: 'VALIDATION' });

    await prisma.course.update({ where: { id: c.id }, data: { status } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/courses/:id/students  (approved students, plus how many requests are waiting)
router.get('/courses/:id/students', async (req, res, next) => {
  try {
    const c = await ownCourse(req, res);
    if (!c) return;

    const rows = await prisma.enrollment.findMany({
      where: { courseId: c.id, status: { in: ['ACTIVE', 'PENDING'] } },
      include: { student: { include: { user: { select: { fullName: true, email: true, phone: true } } } } },
      orderBy: { createdAt: 'asc' },
    });
    const active = rows.filter((e) => e.status === 'ACTIVE');

    res.json({
      course: { id: c.id, title: { uz: c.titleUz, en: c.titleEn } },
      students: active.map((e) => ({
        id: e.id,
        fullName: e.student.user.fullName,
        email: e.student.user.email,
        phone: e.student.user.phone,
        grade: e.student.grade,
      })),
      pending: rows.length - active.length,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- Lessons ----------

// Accepts only full http(s) links. Anything else (javascript:, data:, ...) is refused.
function parseUrl(value) {
  try {
    const u = new URL(String(value ?? '').trim());
    if (!['http:', 'https:'].includes(u.protocol)) return null;
    const out = u.toString();
    return out.length <= 500 ? out : null;
  } catch {
    return null;
  }
}

function parseLesson(b = {}) {
  const errors = {};

  const title = String(b.title ?? '').trim();
  if (title.length < 3) errors.title = 'required';
  else if (title.length > 120) errors.title = 'length';

  const content = String(b.content ?? '').trim();
  if (!content) errors.content = 'required';
  else if (content.length > 10000) errors.content = 'length';

  let videoUrl = null;
  const rawVideo = String(b.videoUrl ?? '').trim();
  if (rawVideo) {
    videoUrl = parseUrl(rawVideo);
    if (!videoUrl) errors.videoUrl = 'url';
  }

  const materials = [];
  if (b.materials !== undefined) {
    if (!Array.isArray(b.materials) || b.materials.length > 10) {
      errors.materials = 'materials';
    } else {
      for (const m of b.materials) {
        const mTitle = String(m?.title ?? '').trim();
        const mUrl = parseUrl(m?.url);
        if (!mTitle || mTitle.length > 100 || !mUrl) {
          errors.materials = 'materials';
          break;
        }
        materials.push({ title: mTitle, url: mUrl });
      }
    }
  }

  return { errors, data: { title, content, videoUrl }, materials };
}

// A teacher can only touch lessons of their own courses. Anything else answers "not found".
async function ownLesson(req, res) {
  const lesson = await prisma.lesson.findUnique({
    where: { id: req.params.lessonId },
    include: { course: { select: { teacherId: true } }, materials: { orderBy: { createdAt: 'asc' } } },
  });
  if (!lesson || lesson.course.teacherId !== req.teacher.id) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return null;
  }
  return lesson;
}

// GET /api/teacher/courses/:id/lessons
router.get('/courses/:id/lessons', async (req, res, next) => {
  try {
    const c = await ownCourse(req, res);
    if (!c) return;
    const rows = await prisma.lesson.findMany({
      where: { courseId: c.id },
      include: { _count: { select: { materials: true } } },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    res.json({
      course: { id: c.id, title: { uz: c.titleUz, en: c.titleEn } },
      lessons: rows.map((l) => ({
        id: l.id,
        title: l.title,
        hasVideo: !!l.videoUrl,
        materialCount: l._count.materials,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/teacher/courses/:id/lessons
router.post('/courses/:id/lessons', async (req, res, next) => {
  try {
    const c = await ownCourse(req, res);
    if (!c) return;
    const { errors, data, materials } = parseLesson(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    const last = await prisma.lesson.findFirst({
      where: { courseId: c.id },
      orderBy: { position: 'desc' },
      select: { position: true },
    });
    const lesson = await prisma.lesson.create({
      data: { ...data, courseId: c.id, position: (last?.position ?? 0) + 1, materials: { create: materials } },
    });
    res.status(201).json({ lesson: { id: lesson.id } });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/lessons/:lessonId
router.get('/lessons/:lessonId', async (req, res, next) => {
  try {
    const l = await ownLesson(req, res);
    if (!l) return;
    res.json({
      lesson: {
        id: l.id,
        courseId: l.courseId,
        title: l.title,
        content: l.content,
        videoUrl: l.videoUrl,
        materials: l.materials.map((m) => ({ id: m.id, title: m.title, url: m.url })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teacher/lessons/:lessonId  (the material list is replaced as a whole)
router.put('/lessons/:lessonId', async (req, res, next) => {
  try {
    const l = await ownLesson(req, res);
    if (!l) return;
    const { errors, data, materials } = parseLesson(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    await prisma.$transaction([
      prisma.material.deleteMany({ where: { lessonId: l.id } }),
      prisma.lesson.update({ where: { id: l.id }, data: { ...data, materials: { create: materials } } }),
    ]);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/teacher/lessons/:lessonId
router.delete('/lessons/:lessonId', async (req, res, next) => {
  try {
    const l = await ownLesson(req, res);
    if (!l) return;
    await prisma.lesson.delete({ where: { id: l.id } }); // its materials are deleted with it
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/teacher/lessons/:lessonId/move   body: { direction: 'up' | 'down' }
router.patch('/lessons/:lessonId/move', async (req, res, next) => {
  try {
    const l = await ownLesson(req, res);
    if (!l) return;
    const direction = (req.body || {}).direction;
    if (!['up', 'down'].includes(direction)) return res.status(400).json({ error: 'VALIDATION' });

    const siblings = await prisma.lesson.findMany({
      where: { courseId: l.courseId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
      select: { id: true },
    });
    const order = siblings.map((s) => s.id);
    const i = order.indexOf(l.id);
    const j = direction === 'up' ? i - 1 : i + 1;
    if (j < 0 || j >= order.length) return res.json({ ok: true });

    [order[i], order[j]] = [order[j], order[i]];
    // Renumber everything 1..n, which also repairs any duplicate positions
    await prisma.$transaction(
      order.map((id, idx) => prisma.lesson.update({ where: { id }, data: { position: idx + 1 } }))
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;