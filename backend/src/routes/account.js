const express = require('express');
const prisma = require('../db');
const { requireAuth } = require('../middleware/auth');
const { avatarLimiter } = require('../middleware/limits');
const { uploadImageOne, isImage, processAvatar, saveAvatar, removeFile } = require('../uploads');

const router = express.Router();

// Every route here is for the logged-in person's own account
router.use(requireAuth);

// POST /api/account/avatar   (multipart form: "file")
router.post('/avatar', avatarLimiter, uploadImageOne, async (req, res, next) => {
  let newName = null;
  try {
    if (!req.file || !isImage(req.file.buffer)) return res.status(400).json({ error: 'NOT_IMAGE' });

    let processed;
    try {
      processed = await processAvatar(req.file.buffer);
    } catch {
      return res.status(400).json({ error: 'NOT_IMAGE' }); // damaged file, or too many pixels
    }

    newName = await saveAvatar(processed);
    const before = await prisma.user.findUnique({ where: { id: req.auth.id }, select: { avatarStored: true } });
    await prisma.user.update({
      where: { id: req.auth.id },
      data: { avatarStored: newName, avatarUpdatedAt: new Date() },
    });

    // A new photo is never public until the teacher says so again
    await prisma.teacherProfile.updateMany({ where: { userId: req.auth.id }, data: { avatarPublic: false } });

    if (before && before.avatarStored) await removeFile(before.avatarStored); // the old photo is not kept
    res.json({ ok: true });
  } catch (err) {
    if (newName) await removeFile(newName);
    next(err);
  }
});

// DELETE /api/account/avatar
router.delete('/avatar', async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.auth.id }, select: { avatarStored: true } });
    if (user && user.avatarStored) {
      await prisma.user.update({ where: { id: req.auth.id }, data: { avatarStored: null, avatarUpdatedAt: null } });
      await prisma.teacherProfile.updateMany({ where: { userId: req.auth.id }, data: { avatarPublic: false } });
      await removeFile(user.avatarStored);
    }
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;