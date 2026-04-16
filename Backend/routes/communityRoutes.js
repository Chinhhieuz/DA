const express = require('express');
const communityController = require('../controllers/communityController');
const { isAdmin } = require('../middlewares/adminMiddleware');
const { cachePublicGet } = require('../middlewares/cacheMiddleware');

const router = express.Router();

router.get('/', cachePublicGet({ sMaxAge: 120, staleWhileRevalidate: 600 }), communityController.getAllCommunities);
router.post('/', isAdmin, communityController.createCommunity);
router.put('/:id', isAdmin, communityController.updateCommunity);
router.delete('/:id', isAdmin, communityController.deleteCommunity);

module.exports = router;
