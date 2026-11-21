const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const sharp = require('sharp');

const DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(DIR, { recursive: true });

const MAX_BYTES = 10 * 1024 * 1024; // PDFs: 10 MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // photos: 5 MB

// Files are kept in memory first, so nothing touches the disk until we have checked them
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1, fields: 12 },
});
const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_IMAGE_BYTES, files: 1, fields: 2 },
});

// Middleware: reads one PDF from the form field "file" and turns upload errors into clean answers
function uploadOne(req, res, next) {
  upload.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'FILE_TOO_LARGE' });
    return res.status(400).json({ error: 'NOT_PDF' });
  });
}

// The same for one photo
function uploadImageOne(req, res, next) {
  uploadImage.single('file')(req, res, (err) => {
    if (!err) return next();
    if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'IMAGE_TOO_LARGE' });
    return res.status(400).json({ error: 'NOT_IMAGE' });
  });
}

// A real PDF starts with the bytes "%PDF-". The file name or type sent by the browser is not trusted.
function isPdf(buffer) {
  return buffer.length > 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-';
}

// Only JPEG, PNG and WebP are accepted, judged by the first bytes of the file (so no SVG or GIF)
function isImage(buffer) {
  if (buffer.length < 12) return false;
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const png = buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  const webp = buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP';
  return jpeg || png || webp;
}

// Decodes the photo and builds a brand-new 384x384 WebP. This drops all hidden data (location, camera,
// dates) and refuses pictures with an absurd number of pixels. Throws if the file is not a real image.
function processAvatar(buffer) {
  return sharp(buffer, { limitInputPixels: 24000000 })
    .rotate() // applies the camera's orientation first
    .resize(384, 384, { fit: 'cover' })
    .webp({ quality: 82 })
    .toBuffer();
}

async function writeRandom(buffer, extension) {
  const name = `${crypto.randomBytes(16).toString('hex')}.${extension}`;
  await fs.promises.writeFile(path.join(DIR, name), buffer, { flag: 'wx' });
  return name;
}

const savePdf = (buffer) => writeRandom(buffer, 'pdf');
const saveAvatar = (buffer) => writeRandom(buffer, 'webp');

// Only names we generated ourselves are accepted, so a path can never escape the uploads folder
function filePath(name) {
  return /^[a-f0-9]{32}\.(pdf|webp)$/.test(name) ? path.join(DIR, name) : null;
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

module.exports = { uploadOne, uploadImageOne, isPdf, isImage, processAvatar, savePdf, saveAvatar, filePath, removeFile };