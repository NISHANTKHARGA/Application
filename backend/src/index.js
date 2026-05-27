require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

let sequelize = null;
let sequelizeInitError = null;
let authRoutes, lawyerRoutes, appointmentRoutes, chatRoutes;
let authRoutesError, lawyerRoutesError, apptRoutesError, chatRoutesError;
try {
  const models = require('./models');
  sequelize = models.sequelize;
  sequelizeInitError = models.sequelizeError;
} catch (e) {
  console.error('Model load error:', e?.message);
}
try { authRoutes = require('./routes/auth'); } catch (e) { authRoutesError = e; console.error('Auth routes error:', e?.message); }
try { lawyerRoutes = require('./routes/lawyer'); } catch (e) { lawyerRoutesError = e; console.error('Lawyer routes error:', e?.message); }
try { appointmentRoutes = require('./routes/appointment'); } catch (e) { apptRoutesError = e; console.error('Appt routes error:', e?.message); }
try { chatRoutes = require('./routes/chat'); } catch (e) { chatRoutesError = e; console.error('Chat routes error:', e?.message); }

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL || 'http://localhost:3000',
  'http://localhost:3000',
  'http://localhost:3001',
  'https://frontend-nu-ochre.vercel.app',
].filter(Boolean);

app.use((req, res, next) => {
  console.log('Request:', req.method, req.url);
  next();
});

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
  } catch (e) {}
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

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'KanoonSathi Backend is running', version: '1.1.0' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KanoonSathi API is running', db: dbReady ? 'connected' : (dbError || 'pending') });
});

if (authRoutes) {
  app.use('/api/auth', authRoutes);
  const routeCount = authRoutes.stack ? authRoutes.stack.filter(s => s.route).length : '?';
  console.log('Auth routes registered (' + routeCount + ' routes)');
  if (!authRoutes.stack || authRoutes.stack.length === 0) {
    console.error('Auth routes has empty stack!');
  }
} else {
  app.all('/api/auth/*', (req, res) => res.status(500).json({
    message: 'Auth module failed to load',
    error: authRoutesError?.message || authRoutesError?.code || 'Unknown error',
    stack: authRoutesError?.stack?.split('\n')?.slice(0, 3)?.join(' | ')
  }));
}
if (lawyerRoutes) app.use('/api/lawyer', lawyerRoutes);
if (appointmentRoutes) app.use('/api/appointment', appointmentRoutes);
if (chatRoutes) app.use('/api/chat', chatRoutes);

app.get('/api/debug', async (req, res) => {
  const info = {
    dbConnected: dbReady,
    dbError,
    dbSequelize: !!sequelize,
    sequelizeInitError,
    routes: {
      auth: !!authRoutes,
      authError: authRoutesError?.message || null,
      lawyer: !!lawyerRoutes,
      appointment: !!appointmentRoutes,
      chat: !!chatRoutes
    }
  };
  if (sequelize) {
    try {
      await sequelize.authenticate();
      info.dbAuthOk = true;
      const tables = await sequelize.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
      info.tables = tables[0]?.map(t => t.table_name) || [];
    } catch (e) {
      info.dbAuthOk = false;
      info.dbAuthError = e?.message;
    }
  }
  res.json(info);
});

app.use((err, req, res, next) => {
  console.error('Error:', err?.message);
  res.status(err.status || 500).json({ message: err?.message || 'Internal Server Error' });
});

app.use((req, res) => {
  res.status(404).json({
    message: 'Route not found',
    url: req.url,
    method: req.method,
    authLoaded: !!authRoutes,
    authError: authRoutesError?.message || null,
    modelError: typeof sequelize === 'undefined' || sequelize === null ? 'Models failed to load' : null
  });
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

module.exports = (req, res) => {
  try { app(req, res); } catch (e) {
    console.error('Fatal:', e);
    if (!res.headersSent) res.status(500).json({ message: 'Internal server error' });
  }
};
