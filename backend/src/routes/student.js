const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Every route here needs a valid token AND a student account that is active in the database.
router.use(requireAuth, async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({ where: { id: req.auth.id }, include: { student: true } });
    if (!me || me.status !== 'ACTIVE') return res.status(401).json({ error: 'INVALID_TOKEN' });
    if (me.role !== 'STUDENT' || !me.student) return res.status(403).json({ error: 'FORBIDDEN' });
    req.student = me.student;
    next();
  } catch (err) {
    next(err);
  }
});

const ORDER = [{ position: 'asc' }, { createdAt: 'asc' }];

// A course is open to a student only if it is published AND their enrollment is approved.
const openTo = (studentId) => ({
  status: 'PUBLISHED',
  enrollments: { some: { studentId, status: 'ACTIVE' } },
});

// The student's open courses with progress numbers and the next lesson to study
async function loadProgress(studentId) {
  const courses = await prisma.course.findMany({
    where: openTo(studentId),
    include: {
      lessons: { select: { id: true }, orderBy: ORDER },
      teacher: { include: { user: { select: { fullName: true } } } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const lessonIds = courses.flatMap((c) => c.lessons.map((l) => l.id));
  const done = lessonIds.length
    ? await prisma.lessonProgress.findMany({
        where: { studentId, lessonId: { in: lessonIds } },
        select: { lessonId: true },
      })
    : [];
  const doneSet = new Set(done.map((d) => d.lessonId));

  return courses.map((c) => {
    const total = c.lessons.length;
    const completed = c.lessons.filter((l) => doneSet.has(l.id)).length;
    const next = c.lessons.find((l) => !doneSet.has(l.id));
    return {
      id: c.slug,
      category: c.category.toLowerCase(),
      title: { uz: c.titleUz, en: c.titleEn },
      teacher: c.teacher.user.fullName,
      totalLessons: total,
      completedLessons: completed,
      percent: total ? Math.round((completed / total) * 100) : 0,
      nextLessonId: next ? next.id : null,
    };
  });
}

// GET /api/student/overview
router.get('/overview', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const [courses, waiting] = await Promise.all([
      loadProgress(studentId),
      prisma.enrollment.count({ where: { studentId, status: 'PENDING' } }),
    ]);
    res.json({
      stats: {
        activeCourses: courses.length,
        completedLessons: courses.reduce((sum, c) => sum + c.completedLessons, 0),
        waiting,
      },
      courses,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/student/courses
router.get('/courses', async (req, res, next) => {
  try {
    res.json({ courses: await loadProgress(req.student.id) });
  } catch (err) {
    next(err);
  }
});

// GET /api/student/courses/:slug  (the lessons of one course)
router.get('/courses/:slug', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const course = await prisma.course.findFirst({
      where: { slug: req.params.slug, ...openTo(studentId) },
    });
    if (!course) return res.status(404).json({ error: 'NOT_FOUND' });

    const lessons = await prisma.lesson.findMany({
      where: { courseId: course.id },
      orderBy: ORDER,
      select: { id: true, title: true, progress: { where: { studentId }, select: { id: true } } },
    });

    res.json({
      course: {
        id: course.slug,
        title: { uz: course.titleUz, en: course.titleEn },
        summary: { uz: course.summaryUz, en: course.summaryEn },
      },
      lessons: lessons.map((l) => ({ id: l.id, title: l.title, completed: l.progress.length > 0 })),
    });
  } catch (err) {
    next(err);
  }
});

// Finds a lesson only if its course is open to this student. Otherwise null ("not found").
function openLesson(studentId, lessonId) {
  return prisma.lesson.findFirst({
    where: { id: lessonId, course: openTo(studentId) },
    include: { materials: { orderBy: { createdAt: 'asc' } }, course: true },
  });
}

// GET /api/student/lessons/:lessonId
router.get('/lessons/:lessonId', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const lesson = await openLesson(studentId, req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'NOT_FOUND' });

    const siblings = await prisma.lesson.findMany({
      where: { courseId: lesson.courseId },
      orderBy: ORDER,
      select: { id: true },
    });
    const i = siblings.findIndex((s) => s.id === lesson.id);
    const progress = await prisma.lessonProgress.findUnique({
      where: { studentId_lessonId: { studentId, lessonId: lesson.id } },
    });

    res.json({
      course: { id: lesson.course.slug, title: { uz: lesson.course.titleUz, en: lesson.course.titleEn } },
      lesson: {
        id: lesson.id,
        title: lesson.title,
        content: lesson.content,
        videoUrl: lesson.videoUrl,
        materials: lesson.materials.map((m) => ({ id: m.id, title: m.title, url: m.url })),
        completed: !!progress,
        number: i + 1,
        total: siblings.length,
      },
      prevId: i > 0 ? siblings[i - 1].id : null,
      nextId: i < siblings.length - 1 ? siblings[i + 1].id : null,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/student/lessons/:lessonId/progress   body: { completed: true | false }
router.put('/lessons/:lessonId/progress', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const completed = (req.body || {}).completed;
    if (typeof completed !== 'boolean') return res.status(400).json({ error: 'VALIDATION' });

    const lesson = await openLesson(studentId, req.params.lessonId);
    if (!lesson) return res.status(404).json({ error: 'NOT_FOUND' });

    if (completed) {
      await prisma.lessonProgress.upsert({
        where: { studentId_lessonId: { studentId, lessonId: lesson.id } },
        update: {},
        create: { studentId, lessonId: lesson.id },
      });
    } else {
      await prisma.lessonProgress.deleteMany({ where: { studentId, lessonId: lesson.id } });
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;