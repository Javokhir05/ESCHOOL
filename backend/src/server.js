require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { apiLimiter } = require('./middleware/limits');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');
const enrollmentRoutes = require('./routes/enrollments');
const adminRoutes = require('./routes/admin');
const teacherRoutes = require('./routes/teacher');
const studentRoutes = require('./routes/student');
const fileRoutes = require('./routes/files');
const publicRoutes = require('./routes/public');
const messageRoutes = require('./routes/messages');

// Refuse to start with unsafe settings
if ((process.env.JWT_SECRET || '').length < 32) {
  console.error('JWT_SECRET must be at least 32 characters. Generate one with the command from the setup steps.');
  process.exit(1);
}
if (!process.env.CLIENT_URL) {
  console.error('CLIENT_URL is missing in .env (without it, any website could call this API).');
  process.exit(1);
}

const app = express();

// Behind a reverse proxy (nginx, a hosting platform), set TRUST_PROXY=1 in .env so the rate limits see the
// real visitor address. Leave it unset when the API is reached directly, otherwise visitors could fake theirs.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_URL.split(',').map((s) => s.trim()), maxAge: 600 }));
app.use(express.json({ limit: '50kb' }));
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/enrollments', enrollmentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/teacher', teacherRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/messages', messageRoutes);

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// Last resort: log the real error on the server, send a generic one to the client
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'BAD_REQUEST' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'TOO_LARGE' });
  console.error(err);
  res.status(500).json({ error: 'SERVER_ERROR' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`ESCHOOL API running on http://localhost:${port}`));