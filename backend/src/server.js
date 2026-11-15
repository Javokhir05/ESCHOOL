require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const courseRoutes = require('./routes/courses');

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is missing in .env');
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);

app.use((req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// Last resort: log the real error on the server, send a generic one to the client
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'SERVER_ERROR' });
});

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`ESCHOOL API running on http://localhost:${port}`));