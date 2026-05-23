require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { sequelize } = require('./models');

try {
  const uploadsDir = path.join(__dirname, '../uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
} catch (e) {
  console.log('Note: uploads dir not writable (expected on Vercel)');
}

const authRoutes = require('./routes/auth');
const lawyerRoutes = require('./routes/lawyer');
const appointmentRoutes = require('./routes/appointment');
const chatRoutes = require('./routes/chat');

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

let dbSynced = false;
let syncPromise = null;

const syncDb = async () => {
  if (dbSynced) return;
  if (syncPromise) return syncPromise;
  syncPromise = (async () => {
    await sequelize.authenticate();
    await sequelize.sync({ force: false });
    dbSynced = true;
    console.log('Database synced');
  })();
  return syncPromise;
};

app.use((req, res, next) => {
  syncDb().catch(err => console.error('DB sync error:', err?.message));
  next();
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KanoonSathi API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/lawyer', lawyerRoutes);
app.use('/api/appointment', appointmentRoutes);
app.use('/api/chat', chatRoutes);

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error'
  });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`KanoonSathi Backend Server running on port ${PORT}`);
    syncDb().catch(console.error);
  });
}

module.exports = app;
