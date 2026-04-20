const express = require('express');
const commentController = require('../controllers/commentController');
const { cachePublicGet } = require('../middlewares/cacheMiddleware');
const { protect, optionalProtect } = require('../middlewares/authMiddleware');

const router = express.Router();

// Định tuyến để tạo bình luận mới (Sử dụng hàm từ commentController)
router.post('/create', protect, commentController.createComment);

// Lấy danh sách bình luận (kèm phản hồi) của 1 bài viết
// Public route + optional token: neu co token se tinh userVote, neu khong thi van xem duoc.
router.get('/post/:postId', optionalProtect, cachePublicGet({ sMaxAge: 30, staleWhileRevalidate: 120 }), commentController.getCommentsByPost);

router.get('/user/:userId', commentController.getCommentsByUser);

router.put('/:id/react', protect, commentController.reactToComment);
router.delete('/:id', protect, commentController.deleteComment);

module.exports = router;
