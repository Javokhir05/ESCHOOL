const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { filePath } = require('../uploads');

const router = express.Router();

// GET /api/files/materials/:id
// Teachers see their own files, admins see all, students only for approved enrollments in published courses.
// Everyone else gets "not found", which also hides whether the file exists.
router.get('/materials/:id', requireAuth, async (req, res, next) => {
  try {
    const me = await prisma.user.findUnique({
      where: { id: req.auth.id },
      include: { student: true, teacher: true },
    });
    if (!me || me.status !== 'ACTIVE') return res.status(401).json({ error: 'INVALID_TOKEN' });

    const material = await prisma.material.findUnique({
      where: { id: req.params.id },
      include: { lesson: { include: { course: true } } },
    });
    const target = material && material.storedName ? filePath(material.storedName) : null;
    if (!material || !target) return res.status(404).json({ error: 'NOT_FOUND' });

    const course = material.lesson.course;
    let allowed = false;
    if (me.role === 'ADMIN') {
      allowed = true;
    } else if (me.role === 'TEACHER') {
      allowed = !!me.teacher && course.teacherId === me.teacher.id;
    } else if (me.role === 'STUDENT' && me.student && course.status === 'PUBLISHED') {
      const enrollment = await prisma.enrollment.findUnique({
        where: { studentId_courseId: { studentId: me.student.id, courseId: course.id } },
      });
      allowed = !!enrollment && enrollment.status === 'ACTIVE';
    }
    if (!allowed) return res.status(404).json({ error: 'NOT_FOUND' });

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
  } catch (err) {
    next(err);
  }
});

module.exports = router;