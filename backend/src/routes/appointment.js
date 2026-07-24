const express = require('express');
const router = express.Router();
const path = require('path');
const { protect, adminOnly, lawyerOnly, userOnly } = require('../middleware/auth');
const {
  bookAppointment,
  getUserAppointments,
  getLawyerAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  getAllAppointments,
  cancelAppointment,
  requestReschedule,
  respondReschedule,
  checkExistingBooking,
  getBookedSlots,
  confirmMeetingComplete,
  rateAppointment
} = require('../controllers/appointmentController');

let upload = null;
let multerAvailable = false;
try {
  const multer = require('multer');
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, `chat-${Date.now()}${path.extname(file.originalname)}`);
    }
  });
  upload = multer({
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
  multerAvailable = true;
} catch (e) {
  console.error('Multer not available for appointment routes:', e?.message);
}

if (upload) {
  router.post('/book', protect, userOnly, upload.single('chatFile'), bookAppointment);
router.post('/check-existing', protect, userOnly, checkExistingBooking);
} else {
  router.post('/book', protect, userOnly, bookAppointment);
}
router.get('/user/:userId', protect, getUserAppointments);
router.get('/lawyer/me', protect, lawyerOnly, getLawyerAppointments);
router.get('/lawyer/:lawyerId', protect, lawyerOnly, getLawyerAppointments);
router.get('/all', protect, adminOnly, getAllAppointments);
router.get('/booked-slots/:lawyerId/:date', getBookedSlots);
router.put('/:id/rate', protect, userOnly, rateAppointment);
router.put('/:id/confirm-complete', protect, userOnly, confirmMeetingComplete);
router.get('/:id', protect, getAppointmentById);
router.put('/:id/status', protect, lawyerOnly, updateAppointmentStatus);
router.put('/:id/cancel', protect, userOnly, cancelAppointment);
router.put('/:id/reschedule', protect, lawyerOnly, requestReschedule);
router.put('/:id/respond-reschedule', protect, userOnly, respondReschedule);

module.exports = router;
