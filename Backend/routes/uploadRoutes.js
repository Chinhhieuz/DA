const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect } = require('../middlewares/authMiddleware');

const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// Auth middleware for upload: require JWT user from protect middleware.
const requireAuth = async (req, res, next) => {
    try {
        if (req.user?._id) {
            req.authUser = req.user;
            return next();
        }

        return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
    } catch (error) {
        console.error('[UPLOAD] requireAuth error:', error.message);
        return res.status(500).json({ status: 'error', message: 'Loi xac thuc nguoi dung: ' + error.message });
    }
};

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
        folder: 'social-media-uploads',
        allowed_formats: ['jpg', 'png', 'jpeg', 'gif', 'webp', 'svg']
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/', protect, requireAuth, (req, res) => {
    upload.single('image')(req, res, (multerErr) => {
        if (multerErr) {
            if (multerErr.message && (multerErr.message.includes('format') || multerErr.message.includes('allowed_formats'))) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Dinh dang file khong duoc ho tro! Chi nhan JPG, PNG, GIF, WEBP, SVG.'
                });
            }

            if (multerErr.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({ status: 'fail', message: 'File anh qua lon! Toi da 5MB.' });
            }

            return res.status(500).json({ status: 'error', message: 'Loi khi upload anh: ' + (multerErr.message || 'Unknown error') });
        }

        if (!req.file) {
            return res.status(400).json({ status: 'fail', message: 'Khong the upload anh, vui long dinh kem file' });
        }

        const imageUrl = req.file.secure_url || req.file.path;
        return res.status(200).json({
            status: 'success',
            data: { url: imageUrl }
        });
    });
});

module.exports = router;
