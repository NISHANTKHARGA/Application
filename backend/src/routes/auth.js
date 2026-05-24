const express = require('express');
const router = express.Router();
const path = require('path');
const { protect } = require('../middleware/auth');
const { 
  register, 
  login, 
  getMe, 
  lawyerRegister, 
  lawyerLogin,
  updateProfile,
  changePassword
} = require('../controllers/authController');

let upload = null;
try {
  const multer = require('multer');
  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
      cb(null, `lawyer-${Date.now()}${path.extname(file.originalname)}`);
    }
  });
  upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /pdf|jpg|jpeg|png/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      if (extname && mimetype) {
        return cb(null, true);
      }
      cb(new Error('Only PDF, JPG, and PNG files are allowed'));
    }
  });
} catch (e) {
  console.error('Multer not available, lawyer document upload disabled:', e?.message);
}

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);

if (upload) {
  router.post('/lawyer/register', upload.single('document'), lawyerRegister);
} else {
  router.post('/lawyer/register', lawyerRegister);
}
router.post('/lawyer/login', lawyerLogin);

module.exports = router;
