const express = require('express');
const router = express.Router();
const { protect, adminOnly, lawyerOnly } = require('../middleware/auth');
const {
  getAllLawyers,
  getPendingLawyers,
  getLawyerById,
  approveLawyer,
  rejectLawyer,
  updateLawyerProfile,
  getLawyerStats,
  getAllLawyersAdmin,
  getLawyersBySpecialization
} = require('../controllers/lawyerController');

router.get('/all', getAllLawyers);
router.get('/specialization/:specialization', getLawyersBySpecialization);
router.get('/pending', protect, adminOnly, getPendingLawyers);
router.get('/stats', protect, lawyerOnly, getLawyerStats);
router.get('/:id', getLawyerById);
router.put('/approve/:id', protect, adminOnly, approveLawyer);
router.put('/reject/:id', protect, adminOnly, rejectLawyer);
router.put('/profile', protect, lawyerOnly, updateLawyerProfile);
router.get('/', protect, adminOnly, getAllLawyersAdmin);

module.exports = router;
