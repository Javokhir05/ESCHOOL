const crypto = require('crypto');
const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { uploadOne, isPdf, savePdf, removeFile } = require('../uploads');
const { normalizePhone } = require('../phone');

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
// GET /api/teacher/stats
router.get('/stats', async (req, res, next) => {
  try {
    const teacherId = req.teacher.id;
    const [activeRows, published, drafts, waiting, toReview] = await Promise.all([
      prisma.enrollment.findMany({
        where: { status: 'ACTIVE', course: { teacherId } },
        distinct: ['studentId'],
        select: { studentId: true },
      }),
      prisma.course.count({ where: { teacherId, status: 'PUBLISHED' } }),
      prisma.course.count({ where: { teacherId, status: 'DRAFT' } }),
      prisma.enrollment.count({ where: { status: 'PENDING', course: { teacherId } } }),
      prisma.submission.count({ where: { status: 'SUBMITTED', assignment: { course: { teacherId } } } }),
    ]);
    res.json({ stats: { students: activeRows.length, published, drafts, waiting, toReview } });
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
        materials: l.materials.map((m) => ({
          id: m.id, title: m.title, url: m.url, hasFile: !!m.storedName, size: m.size,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teacher/lessons/:lessonId  (files are managed separately)
router.put('/lessons/:lessonId', async (req, res, next) => {
  try {
    const l = await ownLesson(req, res);
    if (!l) return;
    const { errors, data } = parseLesson(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    await prisma.lesson.update({ where: { id: l.id }, data });
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
    const files = l.materials.map((m) => m.storedName).filter(Boolean);
    await prisma.lesson.delete({ where: { id: l.id } }); // its material records are deleted with it
    await Promise.all(files.map(removeFile));
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

// POST /api/teacher/lessons/:lessonId/materials   (multipart form: title + file)
router.post('/lessons/:lessonId/materials', uploadOne, async (req, res, next) => {
  try {
    const l = await ownLesson(req, res);
    if (!l) return;
    if (l.materials.length >= 10) return res.status(400).json({ error: 'TOO_MANY_FILES' });

    const title = String((req.body || {}).title ?? '').trim();
    if (!title || title.length > 100) return res.status(400).json({ error: 'MATERIAL_NAME' });
    if (!req.file || !isPdf(req.file.buffer)) return res.status(400).json({ error: 'NOT_PDF' });

    const storedName = await savePdf(req.file.buffer);
    const material = await prisma.material.create({
      data: { lessonId: l.id, title, storedName, size: req.file.size },
    });
    res.status(201).json({ material: { id: material.id, title: material.title, size: material.size } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/teacher/materials/:id
router.delete('/materials/:id', async (req, res, next) => {
  try {
    const m = await prisma.material.findUnique({
      where: { id: req.params.id },
      include: { lesson: { include: { course: { select: { teacherId: true } } } } },
    });
    if (!m || m.lesson.course.teacherId !== req.teacher.id) return res.status(404).json({ error: 'NOT_FOUND' });

    await prisma.material.delete({ where: { id: m.id } });
    if (m.storedName) await removeFile(m.storedName);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------- Assignments ----------

function parseAssignment(b = {}) {
  const errors = {};

  const title = String(b.title ?? '').trim();
  if (title.length < 3) errors.title = 'required';
  else if (title.length > 120) errors.title = 'length';

  const instructions = String(b.instructions ?? '').trim();
  if (!instructions) errors.instructions = 'required';
  else if (instructions.length > 5000) errors.instructions = 'length';

  const dueAt = new Date(b.dueAt);
  const year = dueAt.getFullYear();
  if (!b.dueAt || Number.isNaN(dueAt.getTime()) || year < 2020 || year > 2100) errors.dueAt = 'date';

  const maxScore = Number(b.maxScore);
  if (b.maxScore === '' || b.maxScore == null || !Number.isInteger(maxScore) || maxScore < 1 || maxScore > 1000) {
    errors.maxScore = 'maxScore';
  }

  return { errors, data: { title, instructions, dueAt, maxScore } };
}

// A teacher can only touch assignments of their own courses. Anything else answers "not found".
async function ownAssignment(req, res) {
  const a = await prisma.assignment.findUnique({
    where: { id: req.params.assignmentId },
    include: { course: { select: { id: true, teacherId: true, titleUz: true, titleEn: true } } },
  });
  if (!a || a.course.teacherId !== req.teacher.id) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return null;
  }
  return a;
}

async function ownSubmission(req, res) {
  const s = await prisma.submission.findUnique({
    where: { id: req.params.submissionId },
    include: {
      assignment: { include: { course: { select: { teacherId: true } } } },
      student: { include: { user: { select: { fullName: true, email: true } } } },
    },
  });
  if (!s || s.assignment.course.teacherId !== req.teacher.id) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return null;
  }
  return s;
}

// GET /api/teacher/assignments
router.get('/assignments', async (req, res, next) => {
  try {
    const teacherId = req.teacher.id;
    const [rows, counts] = await Promise.all([
      prisma.assignment.findMany({
        where: { course: { teacherId } },
        include: {
          course: { select: { id: true, titleUz: true, titleEn: true } },
          submissions: { select: { status: true } },
        },
        orderBy: { dueAt: 'desc' },
      }),
      prisma.enrollment.groupBy({
        by: ['courseId'],
        where: { status: 'ACTIVE', course: { teacherId } },
        _count: { _all: true },
      }),
    ]);
    const students = new Map(counts.map((c) => [c.courseId, c._count._all]));

    res.json({
      assignments: rows.map((a) => ({
        id: a.id,
        title: a.title,
        dueAt: a.dueAt,
        maxScore: a.maxScore,
        course: { id: a.course.id, title: { uz: a.course.titleUz, en: a.course.titleEn } },
        studentCount: students.get(a.courseId) || 0,
        submittedCount: a.submissions.length,
        toReview: a.submissions.filter((s) => s.status === 'SUBMITTED').length,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/teacher/courses/:id/assignments
router.post('/courses/:id/assignments', async (req, res, next) => {
  try {
    const c = await ownCourse(req, res);
    if (!c) return;
    const { errors, data } = parseAssignment(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    const a = await prisma.assignment.create({ data: { ...data, courseId: c.id } });
    res.status(201).json({ assignment: { id: a.id } });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/assignments/:assignmentId  (for the edit form)
router.get('/assignments/:assignmentId', async (req, res, next) => {
  try {
    const a = await ownAssignment(req, res);
    if (!a) return;
    res.json({
      assignment: {
        id: a.id,
        title: a.title,
        instructions: a.instructions,
        dueAt: a.dueAt,
        maxScore: a.maxScore,
        file: a.fileStored ? { name: a.fileName, size: a.fileSize } : null,
        course: { id: a.course.id, title: { uz: a.course.titleUz, en: a.course.titleEn } },
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teacher/assignments/:assignmentId
router.put('/assignments/:assignmentId', async (req, res, next) => {
  try {
    const a = await ownAssignment(req, res);
    if (!a) return;
    const { errors, data } = parseAssignment(req.body);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    // The maximum score cannot drop below a score that was already given
    const tooHigh = await prisma.submission.count({
      where: { assignmentId: a.id, score: { gt: data.maxScore } },
    });
    if (tooHigh > 0) return res.status(400).json({ error: 'VALIDATION', fields: { maxScore: 'scoreLow' } });

    await prisma.assignment.update({ where: { id: a.id }, data });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/teacher/assignments/:assignmentId  (also removes every PDF that belongs to it)
router.delete('/assignments/:assignmentId', async (req, res, next) => {
  try {
    const a = await ownAssignment(req, res);
    if (!a) return;
    const submissions = await prisma.submission.findMany({
      where: { assignmentId: a.id },
      select: { fileStored: true },
    });
    const files = [a.fileStored, ...submissions.map((s) => s.fileStored)].filter(Boolean);

    await prisma.assignment.delete({ where: { id: a.id } });
    await Promise.all(files.map(removeFile));
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/teacher/assignments/:assignmentId/attachment   (multipart form: title + file; replaces the old one)
router.post('/assignments/:assignmentId/attachment', uploadOne, async (req, res, next) => {
  try {
    const a = await ownAssignment(req, res);
    if (!a) return;

    const title = String((req.body || {}).title ?? '').trim();
    if (!title || title.length > 100) return res.status(400).json({ error: 'MATERIAL_NAME' });
    if (!req.file || !isPdf(req.file.buffer)) return res.status(400).json({ error: 'NOT_PDF' });

    const storedName = await savePdf(req.file.buffer);
    await prisma.assignment.update({
      where: { id: a.id },
      data: { fileStored: storedName, fileName: title, fileSize: req.file.size },
    });
    if (a.fileStored) await removeFile(a.fileStored);
    res.status(201).json({ file: { name: title, size: req.file.size } });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/teacher/assignments/:assignmentId/attachment
router.delete('/assignments/:assignmentId/attachment', async (req, res, next) => {
  try {
    const a = await ownAssignment(req, res);
    if (!a) return;
    await prisma.assignment.update({
      where: { id: a.id },
      data: { fileStored: null, fileName: null, fileSize: null },
    });
    if (a.fileStored) await removeFile(a.fileStored);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/assignments/:assignmentId/submissions
// One row per approved student, including the ones who have not submitted yet
router.get('/assignments/:assignmentId/submissions', async (req, res, next) => {
  try {
    const a = await ownAssignment(req, res);
    if (!a) return;

    const [enrollments, submissions] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: a.courseId, status: 'ACTIVE' },
        include: { student: { include: { user: { select: { fullName: true, email: true } } } } },
      }),
      prisma.submission.findMany({
        where: { assignmentId: a.id },
        include: { student: { include: { user: { select: { fullName: true, email: true } } } } },
      }),
    ]);

    const rows = new Map();
    for (const e of enrollments) {
      rows.set(e.studentId, {
        studentId: e.studentId,
        fullName: e.student.user.fullName,
        email: e.student.user.email,
        grade: e.student.grade,
        submission: null,
      });
    }
    // A student who submitted but is no longer approved still keeps their row, so no work is lost
    for (const s of submissions) {
      const row = rows.get(s.studentId) || {
        studentId: s.studentId,
        fullName: s.student.user.fullName,
        email: s.student.user.email,
        grade: s.student.grade,
      };
      row.submission = {
        id: s.id,
        status: s.status,
        submittedAt: s.submittedAt,
        late: s.submittedAt > a.dueAt,
        score: s.score,
        hasFile: !!s.fileStored,
        hasText: !!s.text,
      };
      rows.set(s.studentId, row);
    }

    const rank = (r) => (!r.submission ? 2 : r.submission.status === 'SUBMITTED' ? 0 : 1);
    const list = [...rows.values()].sort((x, y) => rank(x) - rank(y) || x.fullName.localeCompare(y.fullName));

    res.json({
      assignment: {
        id: a.id,
        title: a.title,
        dueAt: a.dueAt,
        maxScore: a.maxScore,
        course: { id: a.course.id, title: { uz: a.course.titleUz, en: a.course.titleEn } },
      },
      rows: list,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/submissions/:submissionId
router.get('/submissions/:submissionId', async (req, res, next) => {
  try {
    const s = await ownSubmission(req, res);
    if (!s) return;
    res.json({
      submission: {
        id: s.id,
        text: s.text,
        file: s.fileStored ? { name: s.fileName, size: s.fileSize } : null,
        status: s.status,
        score: s.score,
        feedback: s.feedback,
        submittedAt: s.submittedAt,
        gradedAt: s.gradedAt,
        late: s.submittedAt > s.assignment.dueAt,
      },
      assignment: {
        id: s.assignment.id,
        title: s.assignment.title,
        dueAt: s.assignment.dueAt,
        maxScore: s.assignment.maxScore,
      },
      student: { fullName: s.student.user.fullName, email: s.student.user.email, grade: s.student.grade },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teacher/submissions/:submissionId/grade   body: { score, feedback }
router.put('/submissions/:submissionId/grade', async (req, res, next) => {
  try {
    const s = await ownSubmission(req, res);
    if (!s) return;
    const b = req.body || {};
    const errors = {};

    const raw = b.score;
    const score = raw === '' || raw == null ? NaN : Number(raw);
    if (!Number.isInteger(score) || score < 0 || score > s.assignment.maxScore) errors.score = 'score';

    const feedback = String(b.feedback ?? '').trim();
    if (feedback.length > 2000) errors.feedback = 'length';

    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    await prisma.submission.update({
      where: { id: s.id },
      data: { status: 'GRADED', score, feedback: feedback || null, gradedAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// ---------- Tests ----------

function parseTest(b = {}, withQuestions = true) {
  const errors = {};

  const title = String(b.title ?? '').trim();
  if (title.length < 3) errors.title = 'required';
  else if (title.length > 120) errors.title = 'length';

  const description = String(b.description ?? '').trim();
  if (description.length > 2000) errors.description = 'length';

  let timeLimit = null;
  if (b.timeLimit !== '' && b.timeLimit != null) {
    timeLimit = Number(b.timeLimit);
    if (!Number.isInteger(timeLimit) || timeLimit < 1 || timeLimit > 300) errors.timeLimit = 'timeLimit';
  }

  const maxAttempts = Number(b.maxAttempts);
  if (b.maxAttempts === '' || b.maxAttempts == null || !Number.isInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
    errors.maxAttempts = 'maxAttempts';
  }

  const passPercent = Number(b.passPercent);
  if (b.passPercent === '' || b.passPercent == null || !Number.isInteger(passPercent) || passPercent < 0 || passPercent > 100) {
    errors.passPercent = 'passPercent';
  }

  const showAnswers = b.showAnswers !== false;

  let questions = null;
  if (withQuestions) {
    questions = [];
    if (!Array.isArray(b.questions) || b.questions.length < 1 || b.questions.length > 50) {
      errors.questions = 'questions';
    } else {
      for (const q of b.questions) {
        const text = String(q?.text ?? '').trim();
        const options = Array.isArray(q?.options) ? q.options.map((o) => String(o ?? '').trim()) : [];
        const correct = Number(q?.correct);
        const ok =
          text.length >= 1 && text.length <= 500 &&
          options.length >= 2 && options.length <= 6 &&
          options.every((o) => o.length >= 1 && o.length <= 200) &&
          Number.isInteger(correct) && correct >= 0 && correct < options.length;
        if (!ok) {
          errors.questions = 'questions';
          break;
        }
        questions.push({ text, options, correct });
      }
    }
  }

  return {
    errors,
    data: { title, description: description || null, timeLimit, maxAttempts, passPercent, showAnswers },
    questions,
  };
}

// A teacher can only touch tests of their own courses. Anything else answers "not found".
async function ownTest(req, res) {
  const test = await prisma.test.findUnique({
    where: { id: req.params.testId },
    include: { course: { select: { id: true, teacherId: true, titleUz: true, titleEn: true } } },
  });
  if (!test || test.course.teacherId !== req.teacher.id) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return null;
  }
  return test;
}

// GET /api/teacher/tests
router.get('/tests', async (req, res, next) => {
  try {
    const rows = await prisma.test.findMany({
      where: { course: { teacherId: req.teacher.id } },
      include: {
        course: { select: { id: true, titleUz: true, titleEn: true } },
        _count: { select: { questions: true } },
        attempts: { where: { finishedAt: { not: null } }, select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      tests: rows.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        timeLimit: t.timeLimit,
        maxAttempts: t.maxAttempts,
        passPercent: t.passPercent,
        course: { id: t.course.id, title: { uz: t.course.titleUz, en: t.course.titleEn } },
        questionCount: t._count.questions,
        attemptCount: t.attempts.length,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/teacher/courses/:id/tests  (always created as a draft)
router.post('/courses/:id/tests', async (req, res, next) => {
  try {
    const c = await ownCourse(req, res);
    if (!c) return;
    const { errors, data, questions } = parseTest(req.body, true);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    const test = await prisma.test.create({
      data: {
        ...data,
        courseId: c.id,
        status: 'DRAFT',
        questions: { create: questions.map((q, i) => ({ ...q, position: i + 1 })) },
      },
    });
    res.status(201).json({ test: { id: test.id } });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/tests/:testId  (everything, including the correct answers, for the edit form)
router.get('/tests/:testId', async (req, res, next) => {
  try {
    const t = await ownTest(req, res);
    if (!t) return;
    const [questions, attemptCount] = await Promise.all([
      prisma.question.findMany({ where: { testId: t.id }, orderBy: { position: 'asc' } }),
      prisma.attempt.count({ where: { testId: t.id } }),
    ]);
    res.json({
      test: {
        id: t.id,
        title: t.title,
        description: t.description,
        timeLimit: t.timeLimit,
        maxAttempts: t.maxAttempts,
        passPercent: t.passPercent,
        showAnswers: t.showAnswers,
        status: t.status,
        locked: attemptCount > 0,
        course: { id: t.course.id, title: { uz: t.course.titleUz, en: t.course.titleEn } },
        questions: questions.map((q) => ({ id: q.id, text: q.text, options: q.options, correct: q.correct })),
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teacher/tests/:testId  (the questions change only while nobody has taken the test)
router.put('/tests/:testId', async (req, res, next) => {
  try {
    const t = await ownTest(req, res);
    if (!t) return;
    const locked = (await prisma.attempt.count({ where: { testId: t.id } })) > 0;
    const { errors, data, questions } = parseTest(req.body, !locked);
    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    if (locked) {
      await prisma.test.update({ where: { id: t.id }, data });
    } else {
      await prisma.$transaction([
        prisma.question.deleteMany({ where: { testId: t.id } }),
        prisma.test.update({
          where: { id: t.id },
          data: { ...data, questions: { create: questions.map((q, i) => ({ ...q, position: i + 1 })) } },
        }),
      ]);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/teacher/tests/:testId/status   body: { status: 'DRAFT' | 'PUBLISHED' }
router.patch('/tests/:testId/status', async (req, res, next) => {
  try {
    const t = await ownTest(req, res);
    if (!t) return;
    const status = (req.body || {}).status;
    if (!['DRAFT', 'PUBLISHED'].includes(status)) return res.status(400).json({ error: 'VALIDATION' });

    await prisma.test.update({ where: { id: t.id }, data: { status } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/teacher/tests/:testId  (its questions and every student result are deleted with it)
router.delete('/tests/:testId', async (req, res, next) => {
  try {
    const t = await ownTest(req, res);
    if (!t) return;
    await prisma.test.delete({ where: { id: t.id } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// GET /api/teacher/tests/:testId/results
// One row per approved student, including the ones who have not taken the test yet
router.get('/tests/:testId/results', async (req, res, next) => {
  try {
    const t = await ownTest(req, res);
    if (!t) return;

    const userSelect = { user: { select: { fullName: true, email: true } } };
    const [enrollments, attempts] = await Promise.all([
      prisma.enrollment.findMany({
        where: { courseId: t.courseId, status: 'ACTIVE' },
        include: { student: { include: userSelect } },
      }),
      prisma.attempt.findMany({
        where: { testId: t.id, finishedAt: { not: null } },
        include: { student: { include: userSelect } },
        orderBy: { finishedAt: 'asc' },
      }),
    ]);

    const rows = new Map();
    for (const e of enrollments) {
      rows.set(e.studentId, {
        studentId: e.studentId,
        fullName: e.student.user.fullName,
        email: e.student.user.email,
        grade: e.student.grade,
        attempts: 0,
        bestPercent: null,
        lastAt: null,
      });
    }
    // A student who took the test but is no longer approved keeps their row, so no result is lost
    for (const a of attempts) {
      const row = rows.get(a.studentId) || {
        studentId: a.studentId,
        fullName: a.student.user.fullName,
        email: a.student.user.email,
        grade: a.student.grade,
        attempts: 0,
        bestPercent: null,
        lastAt: null,
      };
      const percent = a.total ? Math.round((a.score / a.total) * 100) : 0;
      row.attempts += 1;
      if (row.bestPercent === null || percent > row.bestPercent) row.bestPercent = percent;
      row.lastAt = a.finishedAt;
      rows.set(a.studentId, row);
    }

    const list = [...rows.values()]
      .map((r) => ({ ...r, passed: r.bestPercent !== null && r.bestPercent >= t.passPercent }))
      .sort((x, y) => (x.attempts === 0) - (y.attempts === 0) || x.fullName.localeCompare(y.fullName));

    res.json({
      test: {
        id: t.id,
        title: t.title,
        passPercent: t.passPercent,
        maxAttempts: t.maxAttempts,
        course: { id: t.course.id, title: { uz: t.course.titleUz, en: t.course.titleEn } },
      },
      rows: list,
    });
  } catch (err) {
    next(err);
  }
});

// ---------- Students and profile ----------

// GET /api/teacher/students  (everyone approved in any of this teacher's courses, with progress per course)
router.get('/students', async (req, res, next) => {
  try {
    const teacherId = req.teacher.id;
    const enrollments = await prisma.enrollment.findMany({
      where: { status: 'ACTIVE', course: { teacherId }, student: { user: { status: 'ACTIVE' } } },
      include: {
        course: { select: { id: true, titleUz: true, titleEn: true, _count: { select: { lessons: true } } } },
        student: { include: { user: { select: { fullName: true, email: true, phone: true } } } },
      },
    });

    const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
    const done = studentIds.length
      ? await prisma.lessonProgress.findMany({
          where: { studentId: { in: studentIds }, lesson: { course: { teacherId } } },
          select: { studentId: true, lesson: { select: { courseId: true } } },
        })
      : [];
    const doneCount = new Map();
    for (const d of done) {
      const key = `${d.studentId}:${d.lesson.courseId}`;
      doneCount.set(key, (doneCount.get(key) || 0) + 1);
    }

    const students = new Map();
    for (const e of enrollments) {
      let s = students.get(e.studentId);
      if (!s) {
        s = {
          id: e.studentId,
          fullName: e.student.user.fullName,
          email: e.student.user.email,
          phone: e.student.user.phone,
          grade: e.student.grade,
          courses: [],
        };
        students.set(e.studentId, s);
      }
      s.courses.push({
        id: e.course.id,
        title: { uz: e.course.titleUz, en: e.course.titleEn },
        totalLessons: e.course._count.lessons,
        completedLessons: doneCount.get(`${e.studentId}:${e.course.id}`) || 0,
      });
    }

    res.json({ students: [...students.values()].sort((a, b) => a.fullName.localeCompare(b.fullName)) });
  } catch (err) {
    next(err);
  }
});

const SUBJECTS = { ielts: 'IELTS', cefr: 'CEFR', academic: 'ACADEMIC' };

// GET /api/teacher/profile
router.get('/profile', async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.auth.id }, include: { teacher: true } });
    res.json({
      profile: {
        fullName: me.fullName,
        email: me.email,
        phone: me.phone,
        subject: me.teacher.subject.toLowerCase(),
        experienceYears: me.teacher.experienceYears,
        bioUz: me.teacher.bioUz || '',
        bioEn: me.teacher.bioEn || '',
      },
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/teacher/profile  (the email is the login and is not changed here)
router.put('/profile', async (req, res, next) => {
  try {
    const b = req.body || {};
    const errors = {};

    const fullName = String(b.fullName ?? '').trim();
    if (fullName.length < 3 || fullName.length > 100) errors.fullName = 'name';

    const phone = normalizePhone(b.phone);
    if (!phone) errors.phone = 'phone';

    const subject = typeof b.subject === 'string' && Object.hasOwn(SUBJECTS, b.subject) ? SUBJECTS[b.subject] : null;
    if (!subject) errors.subject = 'required';

    const experienceYears = Number(b.experience);
    if (b.experience === '' || b.experience == null || !Number.isInteger(experienceYears) || experienceYears < 0 || experienceYears > 60) {
      errors.experience = 'experience';
    }

    const bioUz = String(b.bioUz ?? '').trim();
    const bioEn = String(b.bioEn ?? '').trim();
    if (bioUz.length > 1000) errors.bioUz = 'length';
    if (bioEn.length > 1000) errors.bioEn = 'length';

    if (Object.keys(errors).length) return res.status(400).json({ error: 'VALIDATION', fields: errors });

    await prisma.user.update({
      where: { id: req.auth.id },
      data: {
        fullName,
        phone,
        teacher: { update: { subject, experienceYears, bioUz: bioUz || null, bioEn: bioEn || null } },
      },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;