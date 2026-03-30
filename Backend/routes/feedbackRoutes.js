const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const { isAdmin } = require('../middlewares/adminMiddleware');

const router = express.Router();

// Tất cả người dùng có thể gửi đóng góp
router.post('/', feedbackController.createFeedback);

// Chỉ Admin mới được xem và quản lý đóng góp
router.get('/', isAdmin, feedbackController.getAllFeedback);
router.put('/:id/read', isAdmin, feedbackController.markAsRead);

module.exports = router;
