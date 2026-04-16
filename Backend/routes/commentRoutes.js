const express = require('express');
const commentController = require('../controllers/commentController');
const { cachePublicGet } = require('../middlewares/cacheMiddleware');

const router = express.Router();

// Định tuyến để tạo bình luận mới (Sử dụng hàm từ commentController)
router.post('/create', commentController.createComment);

// Lấy danh sách bình luận (kèm phản hồi) của 1 bài viết
router.get('/post/:postId', cachePublicGet({ sMaxAge: 30, staleWhileRevalidate: 120 }), commentController.getCommentsByPost);

router.get('/user/:userId', commentController.getCommentsByUser);

router.put('/:id/react', commentController.reactToComment);
router.delete('/:id', commentController.deleteComment);

module.exports = router;
