const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Account = require('../models/Account');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Middleware xác thực: chỉ cho phép upload khi người dùng đã đăng nhập (có user_id hợp lệ)
const requireAuth = async (req, res, next) => {
    try {
        // user_id phải được gửi qua query string vì đây là multipart/form-data
        // req.body chưa được parse cho tới khi Multer chạy xong (sau middleware này)
        const userId = req.query.user_id;

        if (!userId) {
            return res.status(401).json({
                status: 'fail',
                message: 'Bạn cần đăng nhập để upload ảnh!'
            });
        }

        const user = await Account.findById(userId);
        if (!user) {
            return res.status(401).json({
                status: 'fail',
                message: 'Tài khoản không tồn tại hoặc đã bị xóa!'
            });
        }

        req.authUser = user; // Lưu user vào request để dùng sau nếu cần
        next();
    } catch (error) {
        console.error('[UPLOAD] Lỗi xác thực user:', error.message);
        return res.status(500).json({ status: 'error', message: 'Lỗi xác thực người dùng!' });
    }
};

// Cấu hình Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Cấu hình lưu trữ Cloudinary cho Multer
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'social-media-uploads',
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif']
  }
});

// Giới hạn max 5MB cho ảnh
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

router.post('/', requireAuth, upload.single('image'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'fail', message: 'Không thể upload ảnh, vui lòng đính kèm file' });
        }

        // Với Cloudinary, URL đầy đủ nằm trong req.file.path hoặc req.file.secure_url
        const imageUrl = req.file.path;
        
        console.log(`[UPLOAD] ✅ User ${req.authUser.username} đã upload ảnh lên Cloudinary: ${imageUrl}`);
        
        return res.status(200).json({
            status: 'success',
            data: {
                url: imageUrl
            }
        });
    } catch (error) {
        console.error('Lỗi Upload:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ khi lưu ảnh lên Cloudinary' });
    }
});

module.exports = router;
