const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  getStats,
  getAllUsers,
  getAllLawyersAdmin,
  getAllAppointmentsAdmin,
  deleteUser,
  deleteLawyer,
  getPendingLawyers,
  approveLawyer,
  rejectLawyer
} = require('../controllers/adminController');

router.get('/stats', protect, adminOnly, getStats);
router.get('/users', protect, adminOnly, getAllUsers);
router.get('/lawyers', protect, adminOnly, getAllLawyersAdmin);
router.get('/appointments', protect, adminOnly, getAllAppointmentsAdmin);
router.delete('/users/:id', protect, adminOnly, deleteUser);
router.delete('/lawyers/:id', protect, adminOnly, deleteLawyer);
router.get('/lawyers/pending', protect, adminOnly, getPendingLawyers);
router.put('/lawyers/approve/:id', protect, adminOnly, approveLawyer);
router.put('/lawyers/reject/:id', protect, adminOnly, rejectLawyer);

module.exports = router;
