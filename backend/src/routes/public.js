const express = require('express');
const prisma = require('../db');

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

module.exports = router;