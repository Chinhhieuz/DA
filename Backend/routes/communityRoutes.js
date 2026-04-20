const express = require('express');
const communityController = require('../controllers/communityController');
const { isAdmin } = require('../middlewares/adminMiddleware');
const { cachePublicGet } = require('../middlewares/cacheMiddleware');
const { protect } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/', cachePublicGet({ sMaxAge: 120, staleWhileRevalidate: 600 }), communityController.getAllCommunities);
// Cac thao tac ghi cua community bat buoc phai qua token + role admin.
router.post('/', protect, isAdmin, communityController.createCommunity);
router.put('/:id', protect, isAdmin, communityController.updateCommunity);
router.delete('/:id', protect, isAdmin, communityController.deleteCommunity);

module.exports = router;
