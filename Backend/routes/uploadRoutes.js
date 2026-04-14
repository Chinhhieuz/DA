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
        const userId = req.query.user_id;
        console.log(`[UPLOAD] 📥 Nhận yêu cầu upload từ User ID: ${userId}`);

        if (!userId) {
            return res.status(401).json({
                status: 'fail',
                message: 'Bạn cần đăng nhập để upload ảnh!'
            });
        }

        // Kiểm tra xem userId có đúng định dạng MongoDB ObjectId không
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.error(`[UPLOAD] ❌ User ID không hợp lệ: ${userId}`);
            return res.status(400).json({
                status: 'fail',
                message: 'ID người dùng không hợp lệ!'
            });
        }

        const user = await Account.findById(userId);
        if (!user) {
            console.error(`[UPLOAD] ❌ Không tìm thấy User ID: ${userId}`);
            return res.status(401).json({
                status: 'fail',
                message: 'Tài khoản không tồn tại hoặc đã bị xóa!'
            });
        }

        req.authUser = user; 
        next();
    } catch (error) {
        console.error('[UPLOAD] 🚨 Lỗi hệ thống trong requireAuth:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi xác thực người dùng: ' + error.message });
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
    allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'svg']
  }
});

// Giới hạn max 5MB cho ảnh
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});

router.post('/', requireAuth, (req, res, next) => {
    // Bọc multer để bắt lỗi và luôn trả về JSON
    upload.single('image')(req, res, (multerErr) => {
        if (multerErr) {
            console.error('[UPLOAD] ❌ Lỗi từ Multer/Cloudinary:', multerErr.message || multerErr);
            
            // Lỗi định dạng (thường từ Cloudinary)
            if (multerErr.message && (multerErr.message.includes('format') || multerErr.message.includes('allowed_formats'))) {
                return res.status(400).json({ 
                    status: 'fail', 
                    message: 'Định dạng file không được hỗ trợ! Hệ thống chỉ nhận JPG, PNG, GIF và SVG.' 
                });
            }

            // Lỗi file quá lớn
            if (multerErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ status: 'fail', message: 'File ảnh quá lớn! Tối đa 5MB.' });
            }

            return res.status(500).json({ status: 'error', message: 'Lỗi khi upload ảnh: ' + (multerErr.message || 'Unknown error') });
        }

        try {
            if (!req.file) {
                return res.status(400).json({ status: 'fail', message: 'Không thể upload ảnh, vui lòng đính kèm file' });
            }

            console.log('[UPLOAD] 📄 Thông tin file nhận được:', {
                originalname: req.file.originalname,
                mimetype: req.file.mimetype,
                size: req.file.size
            });

            // Dùng secure_url (HTTPS) từ Cloudinary thay vì path (có thể là HTTP)
            const imageUrl = req.file.secure_url || req.file.path;
            
            console.log(`[UPLOAD] ✅ User ${req.authUser.username} đã upload thành công: ${imageUrl}`);
            
            return res.status(200).json({
                status: 'success',
                data: {
                    url: imageUrl
                }
            });
        } catch (error) {
            console.error('[UPLOAD] Lỗi xử lý response:', error.message);
            return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ khi lưu ảnh lên Cloudinary' });
        }
    });
});

module.exports = router;
