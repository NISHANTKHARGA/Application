require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'KanoonSathi API is running' });
});

app.get('/api/test', (req, res) => {
  res.json({ success: true, message: 'Serverless function works' });
});

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ message: err?.message || 'Error' });
});

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
}

module.exports = (req, res) => {
  try { app(req, res); } catch (e) {
    console.error('Handler error:', e);
    if (!res.headersSent) res.status(500).json({ message: 'Error' });
  }
};
