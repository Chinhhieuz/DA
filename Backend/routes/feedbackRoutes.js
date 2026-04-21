const express = require('express');
const feedbackController = require('../controllers/feedbackController');
const { isAdmin } = require('../middlewares/adminMiddleware');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Tất cả người dùng có thể gửi đóng góp
router.post('/', protect, feedbackController.createFeedback);

// Chỉ Admin mới được xem và quản lý đóng góp
// protect phai dung truoc isAdmin de middleware co req.user.
router.get('/', protect, isAdmin, feedbackController.getAllFeedback);
router.put('/:id/read', protect, isAdmin, feedbackController.markAsRead);

module.exports = router;
