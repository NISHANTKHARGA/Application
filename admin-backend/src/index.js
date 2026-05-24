require('dotenv').config();
const express = require('express');
const cors = require('cors');

let sequelize = null;
let authRoutes, adminRoutes;
try {
  const models = require('./models');
  sequelize = models.sequelize;
} catch (e) {
  console.error('Model load error:', e?.message);
}
try { authRoutes = require('./routes/auth'); } catch (e) { console.error('Auth routes error:', e?.message); }
try { adminRoutes = require('./routes/admin'); } catch (e) { console.error('Admin routes error:', e?.message); }

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3001',
  'http://localhost:3000',
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.some(a => origin && origin.startsWith(a))) return callback(null, true);
    if (origin.endsWith('.vercel.app')) return callback(null, true);
    callback(null, true);
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let dbReady = false;
let dbError = null;

app.use(async (req, res, next) => {
  if (!dbReady && sequelize && !dbError) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ force: false });
      dbReady = true;
      console.log('Admin DB synced');
    } catch (e) {
      dbError = e?.message || 'DB sync failed';
      console.error('Admin DB sync error:', dbError);
    }
  }
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KanoonSathi Admin API is running', db: dbReady ? 'connected' : (dbError || 'pending') });
});

if (authRoutes) app.use('/api/auth', authRoutes);
if (adminRoutes) app.use('/api/admin', adminRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err?.message);
  res.status(err.status || 500).json({ message: err?.message || 'Internal Server Error' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5001;
  app.listen(PORT, async () => {
    console.log(`KanoonSathi Admin Backend running on port ${PORT}`);
    if (sequelize) {
      try {
        await sequelize.authenticate();
        await sequelize.sync({ force: false });
        dbReady = true;
        console.log('Admin DB synced');
      } catch (e) {
        console.error('Admin DB init error:', e?.message);
      }
    }
  });
}

const handler = (req, res) => {
  try {
    app(req, res);
  } catch (e) {
    console.error('Fatal handler error:', e);
    if (!res.headersSent) res.status(500).json({ message: 'Internal server error' });
  }
};

module.exports = handler;
