const communityService = require('../services/communityService');

const handleServiceError = (error, res) => {
    if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message === 'Tên cộng đồng là bắt buộc!') {
        return res.status(400).json({ status: 'error', message: error.message });
    }
    return res.status(500).json({ status: 'error', message: error.message });
};

const getAllCommunities = async (req, res) => {
    try {
        const communities = await communityService.getAllCommunitiesService();
        return res.status(200).json({ status: 'success', data: communities });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const createCommunity = async (req, res) => {
    try {
        const payload = req.body || {};
        // Neu client khong truyen creator_id thi lay tu token admin hien tai.
        if (!payload.creator_id && req.user?._id) {
            payload.creator_id = String(req.user._id);
        }
        const community = await communityService.createCommunityService(payload);
        return res.status(201).json({ status: 'success', data: community });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const updateCommunity = async (req, res) => {
    try {
        const community = await communityService.updateCommunityService(req.params.id, req.body);
        return res.status(200).json({ status: 'success', data: community });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const deleteCommunity = async (req, res) => {
    try {
        await communityService.deleteCommunityService(req.params.id);
        return res.status(200).json({ status: 'success', message: 'Đã xóa chủ đề thành công!' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

module.exports = { getAllCommunities, createCommunity, deleteCommunity, updateCommunity };
