const express = require('express');
const postingController = require('../controllers/postingController');
const { isAdmin } = require('../middlewares/adminMiddleware');

const router = express.Router();

// API Đăng bài viết
router.post('/', postingController.createPost);

// API Lấy danh sách bài viết đã duyệt
router.get('/', postingController.getAllPosts);

// API Admin: Lấy danh sách bài viết chờ duyệt
router.get('/pending', isAdmin, postingController.getPendingPosts);

// API Admin: Duyệt bài viết
router.put('/:id/approve', isAdmin, postingController.approvePost);

// API Admin: Từ chối bài viết
router.put('/:id/reject', isAdmin, postingController.rejectPost);

// API Thả cảm xúc
router.put('/:id/react', postingController.reactToPost);

// API Xóa bài viết (Chủ sở hữu)
router.delete('/:id', postingController.deletePost);

// API Lưu/Bỏ lưu bài viết
router.post('/:id/save', postingController.toggleSavePost);

// API Lấy danh sách bài viết đã lưu
router.get('/saved/:userId', postingController.getSavedPosts);

module.exports = router;
