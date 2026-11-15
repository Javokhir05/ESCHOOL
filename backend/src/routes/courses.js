const express = require('express');
const prisma = require('../db');

const router = express.Router();

const include = { teacher: { include: { user: { select: { fullName: true } } } } };
const lower = (v) => v.toLowerCase();

// Same shape the frontend already uses: { title: { uz, en } }, lowercase enums
function toListItem(c) {
  return {
    id: c.slug,
    category: lower(c.category),
    level: lower(c.level),
    format: lower(c.format),
    title: { uz: c.titleUz, en: c.titleEn },
    summary: { uz: c.summaryUz, en: c.summaryEn },
    teacher: { id: c.teacher.id, fullName: c.teacher.user.fullName },
  };
}

// GET /api/courses
router.get('/', async (req, res, next) => {
  try {
    const rows = await prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      include,
      orderBy: { createdAt: 'asc' },
    });
    res.json({ courses: rows.map(toListItem) });
  } catch (err) {
    next(err);
  }
});

// GET /api/courses/:slug
router.get('/:slug', async (req, res, next) => {
  try {
    const c = await prisma.course.findFirst({
      where: { slug: req.params.slug, status: 'PUBLISHED' },
      include,
    });
    if (!c) return res.status(404).json({ error: 'NOT_FOUND' });

    res.json({
      course: {
        ...toListItem(c),
        duration: { uz: c.durationUz, en: c.durationEn },
        schedule: { uz: c.scheduleUz, en: c.scheduleEn },
        outcomes: c.outcomes,
        curriculum: c.curriculum,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;