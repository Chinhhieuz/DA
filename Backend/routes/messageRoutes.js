const express = require('express');
const multer = require('multer');
const messageController = require('../controllers/messageController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 }
});

router.use(protect);

router.post('/upload', (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ status: 'fail', message: 'Kich thuoc tep toi da la 50MB' });
        }
        return res.status(400).json({ status: 'fail', message: err.message || 'Upload that bai' });
    });
}, messageController.uploadAttachment);

router.get('/conversations', messageController.getConversations);
router.get('/download', messageController.downloadAttachment);
router.post('/share', messageController.shareMessage);
router.post('/', messageController.sendMessage);
router.post('/start/:userId', messageController.startChat);
router.get('/start/:userId', messageController.startChat);

router.put('/:messageId/revoke', messageController.revokeMessage);
router.put('/:conversationId/read', messageController.markAsRead);
router.delete('/conversations/:conversationId', messageController.deleteConversation);
router.get('/unread-count', messageController.getUnreadCount);
router.get('/:conversationId', (req, res, next) => {
    const conversationId = String(req.params?.conversationId || '').trim();
    if (!/^[0-9a-fA-F]{24}$/.test(conversationId)) {
        return res.status(404).json({ status: 'fail', message: 'Route not found' });
    }
    return messageController.getMessages(req, res, next);
});

console.log('[MESSAGES] Routes initialized and prioritized');
module.exports = router;
