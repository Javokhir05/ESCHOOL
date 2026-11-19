const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { filePath } = require('../uploads');

const router = express.Router();

// Loads the logged-in account. Answers 401 and returns null if it is missing or not active.
async function loadUser(req, res) {
  const me = await prisma.user.findUnique({
    where: { id: req.auth.id },
    include: { student: true, teacher: true },
  });
  if (!me || me.status !== 'ACTIVE') {
    res.status(401).json({ error: 'INVALID_TOKEN' });
    return null;
  }
  return me;
}

const teachesCourse = (me, course) => !!me.teacher && course.teacherId === me.teacher.id;

// A student can open a course's files only if it is published AND their enrollment is approved
async function studentHasAccess(me, course) {
  if (!me.student || course.status !== 'PUBLISHED') return false;
  const enrollment = await prisma.enrollment.findUnique({
    where: { studentId_courseId: { studentId: me.student.id, courseId: course.id } },
  });
  return !!enrollment && enrollment.status === 'ACTIVE';
}

function sendPdf(res, target) {
  res.sendFile(
    target,
    {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
      },
    },
    (err) => {
      if (err && !res.headersSent) res.status(404).json({ error: 'NOT_FOUND' });
    }
  );
}

// Every route answers "not found" when access is not allowed, which also hides whether the file exists.

// GET /api/files/materials/:id  (lesson materials)
router.get('/materials/:id', requireAuth, async (req, res, next) => {
  try {
    const me = await loadUser(req, res);
    if (!me) return;

    const material = await prisma.material.findUnique({
      where: { id: req.params.id },
      include: { lesson: { include: { course: true } } },
    });
    const target = material && material.storedName ? filePath(material.storedName) : null;
    if (!target) return res.status(404).json({ error: 'NOT_FOUND' });

    const course = material.lesson.course;
    const allowed =
      me.role === 'ADMIN' ||
      (me.role === 'TEACHER' && teachesCourse(me, course)) ||
      (me.role === 'STUDENT' && (await studentHasAccess(me, course)));
    if (!allowed) return res.status(404).json({ error: 'NOT_FOUND' });

    sendPdf(res, target);
  } catch (err) {
    next(err);
  }
});

// GET /api/files/assignments/:id  (the PDF a teacher attached to an assignment)
router.get('/assignments/:id', requireAuth, async (req, res, next) => {
  try {
    const me = await loadUser(req, res);
    if (!me) return;

    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: { course: true },
    });
    const target = assignment && assignment.fileStored ? filePath(assignment.fileStored) : null;
    if (!target) return res.status(404).json({ error: 'NOT_FOUND' });

    const allowed =
      me.role === 'ADMIN' ||
      (me.role === 'TEACHER' && teachesCourse(me, assignment.course)) ||
      (me.role === 'STUDENT' && (await studentHasAccess(me, assignment.course)));
    if (!allowed) return res.status(404).json({ error: 'NOT_FOUND' });

    sendPdf(res, target);
  } catch (err) {
    next(err);
  }
});

// GET /api/files/submissions/:id  (work a student handed in: only that student, their teacher, and admins)
router.get('/submissions/:id', requireAuth, async (req, res, next) => {
  try {
    const me = await loadUser(req, res);
    if (!me) return;

    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: { assignment: { include: { course: true } } },
    });
    const target = submission && submission.fileStored ? filePath(submission.fileStored) : null;
    if (!target) return res.status(404).json({ error: 'NOT_FOUND' });

    const allowed =
      me.role === 'ADMIN' ||
      (me.role === 'TEACHER' && teachesCourse(me, submission.assignment.course)) ||
      (me.role === 'STUDENT' && !!me.student && submission.studentId === me.student.id);
    if (!allowed) return res.status(404).json({ error: 'NOT_FOUND' });

    sendPdf(res, target);
  } catch (err) {
    next(err);
  }
});

module.exports = router;