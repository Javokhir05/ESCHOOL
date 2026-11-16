const express = require('express');
const prisma = require('../db');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// Everything here is for logged-in students only
router.use(requireAuth, requireRole('STUDENT'));

// Finds the student profile of the logged-in user (and checks the account is still active)
async function getStudent(req, res) {
  const student = await prisma.studentProfile.findUnique({
    where: { userId: req.auth.id },
    include: { user: { select: { status: true } } },
  });
  if (!student || student.user.status !== 'ACTIVE') {
    res.status(401).json({ error: 'INVALID_TOKEN' });
    return null;
  }
  return student;
}

// GET /api/enrollments/mine
router.get('/mine', async (req, res, next) => {
  try {
    const student = await getStudent(req, res);
    if (!student) return;

    const rows = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: { course: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      enrollments: rows.map((e) => ({
        id: e.id,
        status: e.status,
        createdAt: e.createdAt,
        course: {
          id: e.course.slug,
          category: e.course.category.toLowerCase(),
          title: { uz: e.course.titleUz, en: e.course.titleEn },
        },
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/enrollments   body: { courseSlug }
router.post('/', async (req, res, next) => {
  try {
    const student = await getStudent(req, res);
    if (!student) return;

    const slug = String((req.body || {}).courseSlug || '');
    const course = await prisma.course.findFirst({ where: { slug, status: 'PUBLISHED' } });
    if (!course) return res.status(404).json({ error: 'NOT_FOUND' });

    try {
      const enrollment = await prisma.enrollment.create({
        data: { studentId: student.id, courseId: course.id },
      });
      res.status(201).json({ enrollment: { id: enrollment.id, status: enrollment.status } });
    } catch (err) {
      // P2002 = the unique rule (student + course) was broken: a request already exists
      if (err.code === 'P2002') return res.status(409).json({ error: 'ALREADY_ENROLLED' });
      throw err;
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;