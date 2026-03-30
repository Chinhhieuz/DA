const express = require('express');
const threadController = require('../controllers/threadController');

const router = express.Router();

// Định tuyến để tạo phản hồi mới cho bình luận
router.post('/create', threadController.createThread);
router.delete('/:id', threadController.deleteThread);

module.exports = router;
