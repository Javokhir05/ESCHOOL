const express = require('express');
const { rateLimit } = require('express-rate-limit');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const MAX_LENGTH = 2000;

// Every route here needs a valid token AND an active student or teacher account.
router.use(requireAuth, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.auth.id },
      include: { student: true, teacher: true },
    });
    if (!user || user.status !== 'ACTIVE') return res.status(401).json({ error: 'INVALID_TOKEN' });

    if (user.role === 'STUDENT' && user.student) req.me = { isStudent: true, profileId: user.student.id };
    else if (user.role === 'TEACHER' && user.teacher) req.me = { isStudent: false, profileId: user.teacher.id };
    else return res.status(403).json({ error: 'FORBIDDEN' });
    next();
  } catch (err) {
    next(err);
  }
});

const mineWhere = (me) => (me.isStudent ? { studentId: me.profileId } : { teacherId: me.profileId });

// Two people may message each other only while both accounts are active
// AND the student has an approved enrollment in one of the teacher's courses.
async function canMessage(studentId, teacherId) {
  const [student, teacher] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { id: studentId }, include: { user: { select: { status: true } } } }),
    prisma.teacherProfile.findUnique({ where: { id: teacherId }, include: { user: { select: { status: true } } } }),
  ]);
  if (!student || !teacher) return false;
  if (student.user.status !== 'ACTIVE' || teacher.user.status !== 'ACTIVE') return false;
  const shared = await prisma.enrollment.count({
    where: { studentId, status: 'ACTIVE', course: { teacherId } },
  });
  return shared > 0;
}

// A person can only open their own conversations. Anything else answers "not found".
async function myConversation(req, res) {
  const c = await prisma.conversation.findFirst({
    where: { id: req.params.id, ...mineWhere(req.me) },
    include: {
      student: { include: { user: { select: { fullName: true } } } },
      teacher: { include: { user: { select: { fullName: true } } } },
    },
  });
  if (!c) {
    res.status(404).json({ error: 'NOT_FOUND' });
    return null;
  }
  return c;
}

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30, // messages per person per minute
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.auth.id,
  handler: (req, res) => res.status(429).json({ error: 'TOO_MANY_REQUESTS' }),
});

// GET /api/messages/conversations  (only conversations that have at least one message)
router.get('/conversations', async (req, res, next) => {
  try {
    const { me } = req;
    const rows = await prisma.conversation.findMany({
      where: mineWhere(me),
      include: {
        student: { include: { user: { select: { fullName: true } } } },
        teacher: { include: { user: { select: { fullName: true } } } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 100,
    });

    res.json({
      conversations: rows
        .filter((c) => c.messages.length > 0)
        .map((c) => {
          const last = c.messages[0];
          const readAt = me.isStudent ? c.studentReadAt : c.teacherReadAt;
          return {
            id: c.id,
            other: { fullName: me.isStudent ? c.teacher.user.fullName : c.student.user.fullName },
            last: { text: last.text.slice(0, 100), mine: last.fromStudent === me.isStudent, at: last.createdAt },
            unread: last.fromStudent !== me.isStudent && last.createdAt > readAt,
          };
        }),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/unread  (how many conversations have something new for me)
router.get('/unread', async (req, res, next) => {
  try {
    const { me } = req;
    const rows = await prisma.conversation.findMany({
      where: mineWhere(me),
      select: {
        studentReadAt: true,
        teacherReadAt: true,
        messages: { orderBy: { createdAt: 'desc' }, take: 1, select: { fromStudent: true, createdAt: true } },
      },
    });
    const count = rows.filter((c) => {
      const last = c.messages[0];
      const readAt = me.isStudent ? c.studentReadAt : c.teacherReadAt;
      return !!last && last.fromStudent !== me.isStudent && last.createdAt > readAt;
    }).length;
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/contacts  (the people I am allowed to start a conversation with)
router.get('/contacts', async (req, res, next) => {
  try {
    const { me } = req;

    if (me.isStudent) {
      const rows = await prisma.teacherProfile.findMany({
        where: {
          user: { status: 'ACTIVE' },
          courses: { some: { enrollments: { some: { studentId: me.profileId, status: 'ACTIVE' } } } },
        },
        include: {
          user: { select: { fullName: true } },
          conversations: { where: { studentId: me.profileId }, select: { id: true } },
        },
        orderBy: { user: { fullName: 'asc' } },
      });
      return res.json({
        contacts: rows.map((t) => ({
          id: t.id,
          fullName: t.user.fullName,
          subject: t.subject.toLowerCase(),
          conversationId: t.conversations[0] ? t.conversations[0].id : null,
        })),
      });
    }

    const rows = await prisma.studentProfile.findMany({
      where: {
        user: { status: 'ACTIVE' },
        enrollments: { some: { status: 'ACTIVE', course: { teacherId: me.profileId } } },
      },
      include: {
        user: { select: { fullName: true } },
        conversations: { where: { teacherId: me.profileId }, select: { id: true } },
      },
      orderBy: { user: { fullName: 'asc' } },
    });
    res.json({
      contacts: rows.map((s) => ({
        id: s.id,
        fullName: s.user.fullName,
        grade: s.grade,
        conversationId: s.conversations[0] ? s.conversations[0].id : null,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/conversations   body: { contactId }  (finds or creates the conversation)
router.post('/conversations', async (req, res, next) => {
  try {
    const { me } = req;
    const contactId = String((req.body || {}).contactId ?? '');
    if (!contactId) return res.status(400).json({ error: 'VALIDATION' });

    const studentId = me.isStudent ? me.profileId : contactId;
    const teacherId = me.isStudent ? contactId : me.profileId;
    if (!(await canMessage(studentId, teacherId))) return res.status(403).json({ error: 'CANNOT_MESSAGE' });

    const key = { studentId_teacherId: { studentId, teacherId } };
    let c = await prisma.conversation.findUnique({ where: key });
    if (!c) {
      try {
        c = await prisma.conversation.create({ data: { studentId, teacherId } });
      } catch (err) {
        // P2002 = both people started it at the same moment: use the one that exists
        if (err.code === 'P2002') c = await prisma.conversation.findUnique({ where: key });
        else throw err;
      }
    }
    res.json({ conversation: { id: c.id } });
  } catch (err) {
    next(err);
  }
});

// GET /api/messages/conversations/:id  (the latest 100 messages; opening it marks incoming ones as read)
router.get('/conversations/:id', async (req, res, next) => {
  try {
    const c = await myConversation(req, res);
    if (!c) return;
    const { me } = req;

    const rows = await prisma.message.findMany({
      where: { conversationId: c.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const messages = rows.reverse();

    const readAt = me.isStudent ? c.studentReadAt : c.teacherReadAt;
    const lastIncoming = [...messages].reverse().find((m) => m.fromStudent !== me.isStudent);
    if (lastIncoming && lastIncoming.createdAt > readAt) {
      await prisma.conversation.update({
        where: { id: c.id },
        data: me.isStudent ? { studentReadAt: new Date() } : { teacherReadAt: new Date() },
      });
    }

    res.json({
      conversation: {
        id: c.id,
        other: { fullName: me.isStudent ? c.teacher.user.fullName : c.student.user.fullName },
        canSend: await canMessage(c.studentId, c.teacherId),
      },
      messages: messages.map((m) => ({
        id: m.id,
        mine: m.fromStudent === me.isStudent,
        text: m.text,
        createdAt: m.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/messages/conversations/:id/messages   body: { text }
router.post('/conversations/:id/messages', sendLimiter, async (req, res, next) => {
  try {
    const c = await myConversation(req, res);
    if (!c) return;

    const text = String((req.body || {}).text ?? '').trim();
    if (!text || text.length > MAX_LENGTH) return res.status(400).json({ error: 'MESSAGE_INVALID' });

    if (!(await canMessage(c.studentId, c.teacherId))) return res.status(403).json({ error: 'CANNOT_MESSAGE' });

    const [message] = await prisma.$transaction([
      prisma.message.create({ data: { conversationId: c.id, fromStudent: req.me.isStudent, text } }),
      prisma.conversation.update({ where: { id: c.id }, data: { lastMessageAt: new Date() } }),
    ]);
    res.status(201).json({ message: { id: message.id } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;