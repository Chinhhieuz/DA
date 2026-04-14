const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

// Tất cả các route tin nhắn đều yêu cầu đăng nhập
router.use(protect);

router.get('/conversations', messageController.getConversations);
router.post('/share', messageController.shareMessage);
router.post('/', messageController.sendMessage);
router.post('/start/:userId', messageController.startChat);

router.put('/:messageId/revoke', messageController.revokeMessage);
router.put('/:conversationId/read', messageController.markAsRead);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/:conversationId', messageController.getMessages);

console.log('[MESSAGES] ✅ Routes initialized and prioritized');
module.exports = router;
