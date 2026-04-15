const express = require('express');
const postingController = require('../controllers/postingController');
const { isAdmin } = require('../middlewares/adminMiddleware');
const { postValidation } = require('../middlewares/validateMiddleware');
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

router.post('/', (req, res, next) => {
    postUploadFields(req, res, (err) => {
        if (!err) return next();
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ status: 'fail', message: 'Kich thuoc file toi da la 50MB' });
        }
        return res.status(400).json({ status: 'fail', message: err.message || 'Upload file that bai' });
    });
}, postValidation, postingController.createPost);

router.get('/', postingController.getAllPosts);
router.get('/trending', postingController.getTrendingPosts);
router.get('/search', postingController.searchPosts);
router.get('/pending', isAdmin, postingController.getPendingPosts);
router.get('/admin/community/:communityName', isAdmin, postingController.getCommunityPostsAdmin);
router.put('/:id/approve', isAdmin, postingController.approvePost);
router.put('/:id/reject', isAdmin, postingController.rejectPost);
router.put('/:id/react', postingController.reactToPost);
router.delete('/:id', postingController.deletePost);
router.post('/:id/save', postingController.toggleSavePost);
router.get('/saved/:userId', postingController.getSavedPosts);
router.get('/:id', postingController.getPostById);

module.exports = router;
