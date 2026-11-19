const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { uploadOne, isPdf, savePdf, removeFile } = require('../uploads');

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

// Assignments of the student's open courses, each with the student's own submission status
async function loadAssignments(studentId) {
  const rows = await prisma.assignment.findMany({
    where: { course: openTo(studentId) },
    include: {
      course: { select: { slug: true, titleUz: true, titleEn: true } },
      submissions: { where: { studentId }, select: { status: true, score: true, submittedAt: true } },
    },
    orderBy: { dueAt: 'asc' },
  });
  const now = new Date();
  return rows.map((a) => {
    const sub = a.submissions[0] || null;
    return {
      id: a.id,
      title: a.title,
      dueAt: a.dueAt,
      maxScore: a.maxScore,
      course: { id: a.course.slug, title: { uz: a.course.titleUz, en: a.course.titleEn } },
      status: sub ? sub.status : 'NONE',
      score: sub && sub.status === 'GRADED' ? sub.score : null,
      late: sub ? sub.submittedAt > a.dueAt : false,
      overdue: !sub && a.dueAt < now,
    };
  });
}

// GET /api/student/overview
// GET /api/student/overview
router.get('/overview', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const [courses, waiting, assignments] = await Promise.all([
      loadProgress(studentId),
      prisma.enrollment.count({ where: { studentId, status: 'PENDING' } }),
      loadAssignments(studentId),
    ]);
    const todo = assignments.filter((a) => a.status === 'NONE'); // already sorted by deadline
    res.json({
      stats: {
        activeCourses: courses.length,
        completedLessons: courses.reduce((sum, c) => sum + c.completedLessons, 0),
        waiting,
        pendingTasks: todo.length,
      },
      courses,
      deadlines: todo.slice(0, 3),
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
        materials: lesson.materials.map((m) => ({
        id: m.id, title: m.title, url: m.url, hasFile: !!m.storedName, size: m.size,
        })),
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

// ---------- Assignments ----------

// GET /api/student/assignments
router.get('/assignments', async (req, res, next) => {
  try {
    res.json({ assignments: await loadAssignments(req.student.id) });
  } catch (err) {
    next(err);
  }
});

// GET /api/student/assignments/:assignmentId
router.get('/assignments/:assignmentId', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const a = await prisma.assignment.findFirst({
      where: { id: req.params.assignmentId, course: openTo(studentId) },
      include: {
        course: { select: { slug: true, titleUz: true, titleEn: true } },
        submissions: { where: { studentId } },
      },
    });
    if (!a) return res.status(404).json({ error: 'NOT_FOUND' });

    const s = a.submissions[0] || null;
    const graded = !!s && s.status === 'GRADED';
    res.json({
      assignment: {
        id: a.id,
        title: a.title,
        instructions: a.instructions,
        dueAt: a.dueAt,
        maxScore: a.maxScore,
        file: a.fileStored ? { name: a.fileName, size: a.fileSize } : null,
        course: { id: a.course.slug, title: { uz: a.course.titleUz, en: a.course.titleEn } },
      },
      submission: s
        ? {
            id: s.id,
            text: s.text,
            file: s.fileStored ? { name: s.fileName, size: s.fileSize } : null,
            status: s.status,
            submittedAt: s.submittedAt,
            late: s.submittedAt > a.dueAt,
            // the grade and feedback are shown only after the teacher has graded
            score: graded ? s.score : null,
            feedback: graded ? s.feedback : null,
          }
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /api/student/assignments/:assignmentId/submission
// multipart form: text, optional file (PDF), optional fileName, optional removeFile="true"
// Works for the first submission and for changes, until the teacher grades it.
router.put('/assignments/:assignmentId/submission', uploadOne, async (req, res, next) => {
  let newFile = null; // a PDF saved to disk during this request
  try {
    const studentId = req.student.id;
    const a = await prisma.assignment.findFirst({
      where: { id: req.params.assignmentId, course: openTo(studentId) },
    });
    if (!a) return res.status(404).json({ error: 'NOT_FOUND' });

    const existing = await prisma.submission.findUnique({
      where: { assignmentId_studentId: { assignmentId: a.id, studentId } },
    });
    if (existing && existing.status === 'GRADED') return res.status(409).json({ error: 'ALREADY_GRADED' });

    const b = req.body || {};
    const text = String(b.text ?? '').trim();
    if (text.length > 10000) return res.status(400).json({ error: 'VALIDATION', fields: { text: 'length' } });

    if (req.file) {
      if (!isPdf(req.file.buffer)) return res.status(400).json({ error: 'NOT_PDF' });
      const label = String(b.fileName ?? '').trim().slice(0, 100) || 'PDF';
      newFile = { stored: await savePdf(req.file.buffer), name: label, size: req.file.size };
    }

    // What the submission will contain after this request
    let file = null;
    if (newFile) file = newFile;
    else if (existing && existing.fileStored && b.removeFile !== 'true') {
      file = { stored: existing.fileStored, name: existing.fileName, size: existing.fileSize };
    }
    if (!text && !file) return res.status(400).json({ error: 'EMPTY_SUBMISSION' });

    const data = {
      text: text || null,
      fileStored: file ? file.stored : null,
      fileName: file ? file.name : null,
      fileSize: file ? file.size : null,
      submittedAt: new Date(), // a change after the deadline counts as late
    };

    if (existing) {
      // "status: SUBMITTED" in the filter protects against a teacher grading at the same moment
      const result = await prisma.submission.updateMany({
        where: { id: existing.id, status: 'SUBMITTED' },
        data,
      });
      if (result.count === 0) {
        if (newFile) await removeFile(newFile.stored);
        return res.status(409).json({ error: 'ALREADY_GRADED' });
      }
    } else {
      await prisma.submission.create({ data: { ...data, assignmentId: a.id, studentId } });
    }

    // The old PDF is no longer used, so delete it from the disk
    if (existing && existing.fileStored && existing.fileStored !== data.fileStored) {
      await removeFile(existing.fileStored);
    }
    res.json({ ok: true });
  } catch (err) {
    if (newFile) await removeFile(newFile.stored);
    if (err.code === 'P2002') return res.status(409).json({ error: 'ALREADY_SUBMITTED' });
    next(err);
  }
});

// ---------- Tests ----------

const GRACE_MS = 60 * 1000; // a minute of slack for slow connections

const deadlineOf = (test, attempt) =>
  test.timeLimit ? new Date(attempt.startedAt.getTime() + test.timeLimit * 60 * 1000) : null;

const isExpired = (test, attempt) => {
  const d = deadlineOf(test, attempt);
  return !!d && Date.now() > d.getTime() + GRACE_MS;
};

const percentOf = (score, total) => (total ? Math.round((score / total) * 100) : 0);

// An attempt that ran out of time and was never sent counts as 0
async function settleExpired(test, attempts, total) {
  for (const a of attempts) {
    if (!a.finishedAt && isExpired(test, a)) {
      await prisma.attempt.updateMany({
        where: { id: a.id, finishedAt: null },
        data: { finishedAt: new Date(), score: 0, total },
      });
      a.finishedAt = new Date();
      a.score = 0;
      a.total = total;
    }
  }
}

const testInclude = (studentId) => ({
  course: { select: { slug: true, titleUz: true, titleEn: true } },
  _count: { select: { questions: true } },
  attempts: { where: { studentId }, orderBy: { startedAt: 'desc' } },
});

function summarizeTest(t) {
  const finished = t.attempts.filter((a) => a.finishedAt);
  const open = t.attempts.find((a) => !a.finishedAt);
  const best = finished.length ? Math.max(...finished.map((a) => percentOf(a.score, a.total))) : null;
  return {
    id: t.id,
    title: t.title,
    timeLimit: t.timeLimit,
    maxAttempts: t.maxAttempts,
    passPercent: t.passPercent,
    questionCount: t._count.questions,
    course: { id: t.course.slug, title: { uz: t.course.titleUz, en: t.course.titleEn } },
    attemptsUsed: t.attempts.length,
    inProgressId: open ? open.id : null,
    bestPercent: best,
    passed: best !== null && best >= t.passPercent,
  };
}

// A test is open to a student only if it is published and its course is open to them
const openTest = (studentId) => ({ status: 'PUBLISHED', course: openTo(studentId) });

// GET /api/student/tests
router.get('/tests', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const tests = await prisma.test.findMany({
      where: openTest(studentId),
      include: testInclude(studentId),
      orderBy: { createdAt: 'desc' },
    });
    for (const t of tests) await settleExpired(t, t.attempts, t._count.questions);
    res.json({ tests: tests.map(summarizeTest) });
  } catch (err) {
    next(err);
  }
});

// GET /api/student/tests/:testId
router.get('/tests/:testId', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const t = await prisma.test.findFirst({
      where: { id: req.params.testId, ...openTest(studentId) },
      include: testInclude(studentId),
    });
    if (!t) return res.status(404).json({ error: 'NOT_FOUND' });
    await settleExpired(t, t.attempts, t._count.questions);

    res.json({
      test: { ...summarizeTest(t), description: t.description, showAnswers: t.showAnswers },
      attempts: t.attempts
        .filter((a) => a.finishedAt)
        .map((a) => {
          const percent = percentOf(a.score, a.total);
          return {
            id: a.id,
            finishedAt: a.finishedAt,
            score: a.score,
            total: a.total,
            percent,
            passed: percent >= t.passPercent,
          };
        }),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/student/tests/:testId/start  (continues an attempt in progress, or begins a new one)
router.post('/tests/:testId/start', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const t = await prisma.test.findFirst({
      where: { id: req.params.testId, ...openTest(studentId) },
      include: testInclude(studentId),
    });
    if (!t || t._count.questions === 0) return res.status(404).json({ error: 'NOT_FOUND' });
    await settleExpired(t, t.attempts, t._count.questions);

    const open = t.attempts.find((a) => !a.finishedAt);
    if (open) return res.json({ attemptId: open.id });
    if (t.attempts.length >= t.maxAttempts) return res.status(409).json({ error: 'NO_ATTEMPTS_LEFT' });

    const attempt = await prisma.attempt.create({ data: { testId: t.id, studentId } });
    res.status(201).json({ attemptId: attempt.id });
  } catch (err) {
    next(err);
  }
});

// GET /api/student/attempts/:attemptId
// In progress: the questions WITHOUT the correct answers. Finished: the result.
router.get('/attempts/:attemptId', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const attempt = await prisma.attempt.findFirst({
      where: { id: req.params.attemptId, studentId, test: openTest(studentId) },
      include: { test: { include: { questions: { orderBy: { position: 'asc' } } } } },
    });
    if (!attempt) return res.status(404).json({ error: 'NOT_FOUND' });

    const test = attempt.test;
    const total = test.questions.length;
    if (!attempt.finishedAt && isExpired(test, attempt)) {
      await settleExpired(test, [attempt], total);
    }

    const base = { id: test.id, title: test.title, timeLimit: test.timeLimit, passPercent: test.passPercent };

    if (!attempt.finishedAt) {
      const deadline = deadlineOf(test, attempt);
      return res.json({
        state: 'IN_PROGRESS',
        test: base,
        serverNow: new Date().toISOString(),
        deadline: deadline ? deadline.toISOString() : null,
        questions: test.questions.map((q) => ({ id: q.id, text: q.text, options: q.options })),
      });
    }

    const percent = percentOf(attempt.score, attempt.total);
    const answers = attempt.answers && typeof attempt.answers === 'object' ? attempt.answers : {};
    res.json({
      state: 'FINISHED',
      test: base,
      attempt: {
        score: attempt.score,
        total: attempt.total,
        percent,
        passed: percent >= test.passPercent,
        finishedAt: attempt.finishedAt,
      },
      // the correct answers are revealed only after the attempt is finished, and only if the teacher allows it
      review: test.showAnswers
        ? test.questions.map((q) => ({
            id: q.id,
            text: q.text,
            options: q.options,
            chosen: Number.isInteger(answers[q.id]) ? answers[q.id] : null,
            correct: q.correct,
          }))
        : null,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/student/attempts/:attemptId/submit   body: { answers: { questionId: optionIndex } }
router.post('/attempts/:attemptId/submit', async (req, res, next) => {
  try {
    const studentId = req.student.id;
    const attempt = await prisma.attempt.findFirst({
      where: { id: req.params.attemptId, studentId, test: openTest(studentId) },
      include: { test: { include: { questions: true } } },
    });
    if (!attempt) return res.status(404).json({ error: 'NOT_FOUND' });
    if (attempt.finishedAt) return res.status(409).json({ error: 'ALREADY_FINISHED' });

    const test = attempt.test;
    const total = test.questions.length;
    if (isExpired(test, attempt)) {
      await settleExpired(test, [attempt], total);
      return res.status(409).json({ error: 'TIME_UP' });
    }

    // Only answers that point at a real option of a real question are counted
    const given = (req.body || {}).answers;
    const answers = {};
    let score = 0;
    if (given && typeof given === 'object' && !Array.isArray(given)) {
      for (const q of test.questions) {
        const v = given[q.id];
        if (Number.isInteger(v) && v >= 0 && v < q.options.length) {
          answers[q.id] = v;
          if (v === q.correct) score += 1;
        }
      }
    }

    // "finishedAt: null" in the filter makes sure the same attempt can never be scored twice
    const result = await prisma.attempt.updateMany({
      where: { id: attempt.id, finishedAt: null },
      data: { finishedAt: new Date(), score, total, answers },
    });
    if (result.count === 0) return res.status(409).json({ error: 'ALREADY_FINISHED' });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;