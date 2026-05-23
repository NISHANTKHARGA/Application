const express = require('express');
const router = express.Router();
const { protect, lawyerOnly } = require('../middleware/auth');
const {
  sendMessage,
  getChatHistory,
  downloadConversation,
  deleteChatHistory,
  getCaseSummaries
} = require('../controllers/chatController');

router.post('/', protect, sendMessage);
router.get('/history/:userId', protect, getChatHistory);
router.get('/download/:userId', protect, downloadConversation);
router.delete('/', protect, deleteChatHistory);
router.get('/cases', protect, lawyerOnly, getCaseSummaries);

module.exports = router;
