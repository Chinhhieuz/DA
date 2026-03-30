const express = require('express');
const reportController = require('../controllers/reportController');

const router = express.Router();

// Định tuyến để User tạo báo cáo vi phạm
router.post('/create', reportController.createReport);

// Định tuyến để Admin xử lý vi phạm (Yêu cầu quyền Admin)
router.post('/handle', reportController.handleReport);

// Lấy danh sách tố cáo đang chờ xử lý
router.get('/pending', reportController.getPendingReports);

module.exports = router;
