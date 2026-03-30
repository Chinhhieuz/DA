const express = require('express');
const communityController = require('../controllers/communityController');
const { isAdmin } = require('../middlewares/adminMiddleware');

const router = express.Router();

router.get('/', communityController.getAllCommunities);
router.post('/', isAdmin, communityController.createCommunity);
router.delete('/:id', isAdmin, communityController.deleteCommunity);

module.exports = router;
