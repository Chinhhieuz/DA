const express = require('express');
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middlewares/adminMiddleware');

const router = express.Router();

// API Lấy thống kê tổng quan cho Admin
router.get('/dashboard', isAdmin, adminController.getStats);

// API Lấy danh sách tài khoản bị khóa
router.get('/locked', isAdmin, adminController.getLockedAccounts);

// API Lấy danh sách bài viết bị ẩn (vi phạm)
router.get('/hidden-posts', isAdmin, adminController.getHiddenPosts);

// API Mở khóa tài khoản
router.post('/unlock', isAdmin, adminController.unlockAccount);

// API Khôi phục bài viết
router.post('/posts/:id/restore', isAdmin, adminController.restorePost);

// API Lấy danh sách người dùng (Quản lý User)
router.get('/users', isAdmin, adminController.getUsers);

// API Cập nhật thông tin người dùng
router.put('/users/:id', isAdmin, adminController.updateUser);

// API Xóa người dùng
router.delete('/users/:id', isAdmin, adminController.deleteUser);

module.exports = router;
