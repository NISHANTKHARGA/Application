require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

let sequelize = null;
let authRoutes, lawyerRoutes, appointmentRoutes, chatRoutes;
try {
  const models = require('./models');
  sequelize = models.sequelize;
} catch (e) {
  console.error('Model load error:', e?.message);
}
try { authRoutes = require('./routes/auth'); } catch (e) { console.error('Auth routes error:', e?.message); }
try { lawyerRoutes = require('./routes/lawyer'); } catch (e) { console.error('Lawyer routes error:', e?.message); }
try { appointmentRoutes = require('./routes/appointment'); } catch (e) { console.error('Appt routes error:', e?.message); }
try { chatRoutes = require('./routes/chat'); } catch (e) { console.error('Chat routes error:', e?.message); }

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:3000',
  'http://localhost:3001',
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

const fixSchema = async () => {
  try {
    await sequelize.query(`ALTER TABLE users ALTER COLUMN email DROP NOT NULL;`);
    await sequelize.query(`ALTER TABLE lawyers ALTER COLUMN email DROP NOT NULL;`);
    await sequelize.query(`ALTER TABLE lawyers ALTER COLUMN phone DROP NOT NULL;`);
  } catch (e) {
    // Tables might not exist yet, that's fine
  }
};

app.use(async (req, res, next) => {
  if (!dbReady && sequelize && !dbError) {
    try {
      await sequelize.authenticate();
      await sequelize.sync({ force: false });
      await fixSchema();
      dbReady = true;
      console.log('Database synced');
    } catch (e) {
      dbError = e?.message || 'DB sync failed';
      console.error('DB sync error:', dbError);
    }
  }
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KanoonSathi API is running', db: dbReady ? 'connected' : (dbError || 'pending') });
});

if (authRoutes) app.use('/api/auth', authRoutes);
if (lawyerRoutes) app.use('/api/lawyer', lawyerRoutes);
if (appointmentRoutes) app.use('/api/appointment', appointmentRoutes);
if (chatRoutes) app.use('/api/chat', chatRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err?.message);
  res.status(err.status || 500).json({ message: err?.message || 'Internal Server Error' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, async () => {
    console.log(`KanoonSathi Backend running on port ${PORT}`);
    if (sequelize) {
      try {
        await sequelize.authenticate();
        await sequelize.sync({ force: false });
        dbReady = true;
        console.log('Database synced');
      } catch (e) {
        console.error('DB init error:', e?.message);
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
