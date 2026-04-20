const express = require('express');
const postingController = require('../controllers/postingController');
const { isAdmin } = require('../middlewares/adminMiddleware');
const { protect, optionalProtect } = require('../middlewares/authMiddleware');
const { postValidation } = require('../middlewares/validateMiddleware');
const { cachePublicGet } = require('../middlewares/cacheMiddleware');
const multer = require('multer');

const router = express.Router();

const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    const mimetype = file?.mimetype || '';
    if (file.fieldname === 'image' && mimetype.startsWith('image/')) {
        return cb(null, true);
    }
    if (file.fieldname === 'video' && mimetype.startsWith('video/')) {
        return cb(null, true);
    }
    return cb(new Error('File khong hop le cho truong upload'));
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 }
});

const postUploadFields = upload.fields([
    { name: 'image', maxCount: 10 },
    { name: 'video', maxCount: 1 }
]);

router.post('/', protect, (req, res, next) => {
    postUploadFields(req, res, (err) => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ status: 'fail', message: 'Kich thuoc file toi da la 50MB' });
        }
        return res.status(400).json({ status: 'fail', message: err.message || 'Upload file that bai' });
    });
}, postValidation, postingController.createPost);

router.get(
    '/',
    // optionalProtect cho phep route public nhung van doc duoc req.user neu co token.
    optionalProtect,
    cachePublicGet({
        sMaxAge: 45,
        staleWhileRevalidate: 180,
        shouldBypass: (req) => req.query.followingOnly === 'true'
    }),
    postingController.getAllPosts
);
// Cac route GET nay van public; token (neu co) chi dung de ca nhan hoa ket qua.
router.get('/trending', optionalProtect, cachePublicGet({ sMaxAge: 60, staleWhileRevalidate: 300 }), postingController.getTrendingPosts);
router.get('/search', optionalProtect, cachePublicGet({ sMaxAge: 30, staleWhileRevalidate: 120 }), postingController.searchPosts);
router.get('/pending', protect, isAdmin, postingController.getPendingPosts);
router.get('/admin/community/:communityName', protect, isAdmin, postingController.getCommunityPostsAdmin);
router.put('/:id/approve', protect, isAdmin, postingController.approvePost);
router.put('/:id/reject', protect, isAdmin, postingController.rejectPost);
router.put('/:id/react', protect, postingController.reactToPost);
router.delete('/:id', protect, postingController.deletePost);
router.post('/:id/save', protect, postingController.toggleSavePost);
router.get('/saved/:userId', protect, postingController.getSavedPosts);
router.get('/:id', optionalProtect, cachePublicGet({ sMaxAge: 30, staleWhileRevalidate: 120 }), postingController.getPostById);

module.exports = router;
