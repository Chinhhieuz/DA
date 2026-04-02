const express = require('express');
const postingController = require('../controllers/postingController');
const { isAdmin } = require('../middlewares/adminMiddleware');

const router = express.Router();

// API Đăng bài viết
router.post('/', postingController.createPost);

// API Lấy danh sách bài viết đã duyệt
router.get('/', postingController.getAllPosts);

// API Lấy danh sách bài viết thịnh hành
router.get('/trending', postingController.getTrendingPosts);


// API Tìm kiếm bài viết
router.get('/search', postingController.searchPosts);

// API Admin: Lấy danh sách bài viết chờ duyệt
router.get('/pending', isAdmin, postingController.getPendingPosts);

// API Admin: Lấy danh sách bài viết theo cộng đồng (tất cả trạng thái)
router.get('/admin/community/:communityName', isAdmin, postingController.getCommunityPostsAdmin);

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

// API Lấy nội dung chi tiết một bài viết cụ thể
// Lưu ý: Route này phải để cuối cùng trong các route GET có cấu trúc tương tự (/:id) để không đè lên các route khác
router.get('/:id', postingController.getPostById);

module.exports = router;
