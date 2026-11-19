const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(DIR, { recursive: true });

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

// The file is kept in memory first, so nothing touches the disk until we have checked it
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 12 },
});

// Middleware: reads one file from the form field "file" and turns upload errors into clean answers
function uploadOne(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'FILE_TOO_LARGE' });
    return res.status(400).json({ error: 'NOT_PDF' });
  });
}

// A real PDF starts with the bytes "%PDF-". The file name or type sent by the browser is not trusted.
function isPdf(buffer) {
  return buffer.length > 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

async function savePdf(buffer) {
  const name = `${crypto.randomBytes(16).toString('hex')}.pdf`;
  await fs.promises.writeFile(path.join(DIR, name), buffer, { flag: 'wx' });
  return name;
}

// Only names we generated ourselves are accepted, so a path can never escape the uploads folder
function filePath(name) {
  return /^[a-f0-9]{32}\.pdf$/.test(name) ? path.join(DIR, name) : null;
}

async function removeFile(name) {
  const target = filePath(name);
  if (!target) return;
  try {
    await fs.promises.unlink(target);
  } catch {
    /* already gone: fine */
  }
}

module.exports = { uploadOne, isPdf, savePdf, filePath, removeFile };