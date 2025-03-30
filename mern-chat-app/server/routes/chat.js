const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  markMessagesAsRead,
  deleteMessage,
  editMessage,
  replyToMessage,
  getUnreadCount,
} = require('../controllers/chatController');
const { protect, groupMember } = require('../middlewares/authMiddleware');

// All routes are protected
router.use(protect);

// Message operations
router.post('/messages', sendMessage);
router.get('/messages/:groupId', getMessages);
router.put('/messages/read', markMessagesAsRead);
router.delete('/messages/:id', deleteMessage);
router.put('/messages/:id', editMessage);
router.post('/messages/reply', replyToMessage);
router.get('/messages/unread', getUnreadCount);

module.exports = router;