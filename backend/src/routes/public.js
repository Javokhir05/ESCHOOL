const express = require('express');
const prisma = require('../db');
const { filePath } = require('../uploads');

const router = express.Router();

// "Aziza Karimova" becomes "Aziza K." The full name, email and ids never leave the server.
function shortName(full) {
  const [first = '', second] = String(full).trim().split(/\s+/);
  return second ? `${first} ${second[0].toUpperCase()}.` : first;
}

// GET /api/public/achievements
// Only verified achievements whose student chose to show them, and whose account is still active.
router.get('/achievements', async (req, res, next) => {
  try {
    const rows = await prisma.achievement.findMany({
      where: { status: 'VERIFIED', showPublic: true, student: { user: { status: 'ACTIVE' } } },
      include: { student: { include: { user: { select: { fullName: true } } } } },
      orderBy: { issuedOn: 'desc' },
      take: 12,
    });
    res.json({
      achievements: rows.map((a) => ({
        id: a.id,
        type: a.type.toLowerCase(),
        title: a.title,
        result: a.result,
        issuedOn: a.issuedOn,
        name: shortName(a.student.user.fullName),
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/public/teachers
// Only active teachers who turned this on themselves. No email, phone, photo or internal ids.
router.get('/teachers', async (req, res, next) => {
  try {
    const rows = await prisma.teacherProfile.findMany({
      where: { showPublic: true, user: { status: 'ACTIVE' } },
      include: { user: { select: { fullName: true, avatarStored: true } } },
      orderBy: { user: { fullName: 'asc' } },
      take: 50,
    });
    res.json({
      teachers: rows.map((t) => ({
        fullName: t.user.fullName,
        subject: t.subject.toLowerCase(),
        experienceYears: t.experienceYears,
        bioUz: t.bioUz || '',
        bioEn: t.bioEn || '',
        // only the random file name, and only when the teacher chose to show the photo
        photo: t.avatarPublic && t.user.avatarStored ? t.user.avatarStored : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/public/photos/:name
// Serves a teacher's photo to anyone, but only while the teacher is active and has BOTH
// "show me on the Teachers page" and "show my photo" turned on. Everything else is "not found".
router.get('/photos/:name', async (req, res, next) => {
  try {
    const name = req.params.name;
    const file = /^[a-f0-9]{32}\.webp$/.test(name) ? filePath(name) : null;
    if (!file) return res.status(404).json({ error: 'NOT_FOUND' });

    const owner = await prisma.user.findFirst({
      where: {
        avatarStored: name,
        status: 'ACTIVE',
        teacher: { is: { showPublic: true, avatarPublic: true } },
      },
      select: { id: true },
    });
    if (!owner) return res.status(404).json({ error: 'NOT_FOUND' });

    res.sendFile(
      file,
      {
        headers: {
          'Content-Type': 'image/webp',
          'Content-Disposition': 'inline',
          'X-Content-Type-Options': 'nosniff',
          'Cache-Control': 'public, max-age=300', // a short cache; turning the option off takes effect within minutes
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