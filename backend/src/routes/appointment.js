const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, adminOnly, lawyerOnly, userOnly } = require('../middleware/auth');
const {
  bookAppointment,
  getUserAppointments,
  getLawyerAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  getAllAppointments,
  cancelAppointment
} = require('../controllers/appointmentController');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, `chat-${Date.now()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|txt|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    if (extname) {
      return cb(null, true);
    }
    cb(new Error('Only PDF, TXT, and DOC files are allowed'));
  }
});

router.post('/book', protect, userOnly, upload.single('chatFile'), bookAppointment);
router.get('/user/:userId', protect, getUserAppointments);
router.get('/lawyer/me', protect, lawyerOnly, getLawyerAppointments);
router.get('/lawyer/:lawyerId', protect, lawyerOnly, getLawyerAppointments);
router.get('/all', protect, adminOnly, getAllAppointments);
router.get('/:id', protect, getAppointmentById);
router.put('/:id/status', protect, lawyerOnly, updateAppointmentStatus);
router.put('/:id/cancel', protect, userOnly, cancelAppointment);

module.exports = router;
