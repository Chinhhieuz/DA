const express = require('express');
const reportController = require('../controllers/reportController');
const { protect } = require('../middlewares/authMiddleware');
const { isAdmin } = require('../middlewares/adminMiddleware');

const router = express.Router();

// Định tuyến để User tạo báo cáo vi phạm
router.post('/create', protect, reportController.createReport);

// Định tuyến để Admin xử lý vi phạm (Yêu cầu quyền Admin)
router.post('/handle', protect, isAdmin, reportController.handleReport);

// Lấy danh sách tố cáo đang chờ xử lý
router.get('/pending', protect, isAdmin, reportController.getPendingReports);

module.exports = router;
