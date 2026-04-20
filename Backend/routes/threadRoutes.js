const express = require('express');
const threadController = require('../controllers/threadController');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Định tuyến để tạo phản hồi mới cho bình luận
router.post('/create', protect, threadController.createThread);
router.delete('/:id', protect, threadController.deleteThread);
router.put('/:id/react', protect, threadController.reactToThread);

module.exports = router;
