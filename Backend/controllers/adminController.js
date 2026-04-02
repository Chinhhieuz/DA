const adminService = require('../services/adminService');

const handleServiceError = (error, res) => {
    if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message.startsWith('FORBIDDEN:')) {
        return res.status(403).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    
    console.error('[ADMIN CONTROLLER] 🚨 Lỗi hệ thống:', error.message);
    return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ: ' + error.message });
};

const getStats = async (req, res) => {
    try {
        const stats = await adminService.getStatsService(req.query.admin_id);
        return res.status(200).json({ status: 'success', data: stats });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const unlockAccount = async (req, res) => {
    try {
        await adminService.unlockAccountService(req.body);
        return res.status(200).json({ status: 'success', message: 'Đã mở khóa tài khoản thành công!' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getLockedAccounts = async (req, res) => {
    try {
        const lockedUsers = await adminService.getLockedAccountsService(req.query.admin_id);
        return res.status(200).json({ status: 'success', data: lockedUsers });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getHiddenPosts = async (req, res) => {
    try {
        const hiddenPosts = await adminService.getHiddenPostsService(req.query.admin_id);
        return res.status(200).json({ status: 'success', data: hiddenPosts });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const restorePost = async (req, res) => {
    try {
        await adminService.restorePostService({ admin_id: req.body.admin_id, id: req.params.id });
        return res.status(200).json({ status: 'success', message: 'Đã khôi phục bài viết thành công!' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getUsers = async (req, res) => {
    try {
        const users = await adminService.getUsersService(req.query);
        return res.status(200).json({ status: 'success', data: users });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const updateUser = async (req, res) => {
    try {
        await adminService.updateUserService({ admin_id: req.body.admin_id, id: req.params.id }, req.body);
        return res.status(200).json({ status: 'success', message: 'Cập nhật thông tin người dùng thành công!' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

module.exports = { getStats, unlockAccount, getLockedAccounts, getHiddenPosts, restorePost, getUsers, updateUser };
