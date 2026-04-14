const express = require('express');
const adminController = require('../controllers/adminController');
const { protect } = require('../middlewares/authMiddleware');
const { restrictTo } = require('../middlewares/roleMiddleware');

const router = express.Router();

// TẤT CẢ các route bên dưới đều yêu cầu Đăng nhập và quyền Admin
router.use(protect);
router.use(restrictTo('admin'));

// API Lấy thống kê tổng quan cho Admin
router.get('/dashboard', adminController.getStats);

// API Lấy danh sách tài khoản bị khóa
router.get('/locked', adminController.getLockedAccounts);

// API Lấy danh sách bài viết bị ẩn (vi phạm)
router.get('/hidden-posts', adminController.getHiddenPosts);

// API Mở khóa tài khoản
router.post('/unlock', adminController.unlockAccount);

// API Khôi phục bài viết
router.post('/posts/:id/restore', adminController.restorePost);

// API Lấy danh sách người dùng (Quản lý User)
router.get('/users', adminController.getUsers);

// API Cập nhật thông tin người dùng
router.put('/users/:id', adminController.updateUser);

// API Xóa người dùng
router.delete('/users/:id', adminController.deleteUser);

module.exports = router;
