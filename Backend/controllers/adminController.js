const adminService = require('../services/adminService');

const getAdminIdFromToken = (req) => String(req.user?._id || req.user?.id || '').trim();

const handleServiceError = (error, res) => {
    const message = String(error?.message || 'Unknown error');
    if (message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: message.split(':')[1] });
    }
    if (message.startsWith('FORBIDDEN:')) {
        return res.status(403).json({ status: 'fail', message: message.split(':')[1] });
    }

    console.error('[ADMIN CONTROLLER] System error:', message);
    return res.status(500).json({ status: 'error', message: 'Server error: ' + message });
};

const getStats = async (req, res) => {
    try {
        const adminId = getAdminIdFromToken(req);
        if (!adminId) return res.status(401).json({ status: 'fail', message: 'Unauthorized' });

        const stats = await adminService.getStatsService(adminId);
        return res.status(200).json({ status: 'success', data: stats });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const unlockAccount = async (req, res) => {
    try {
        const adminId = getAdminIdFromToken(req);
        const userId = String(req.body?.user_id || '').trim();
        if (!adminId || !userId) {
            return res.status(400).json({ status: 'fail', message: 'Thieu du lieu mo khoa tai khoan' });
        }

        await adminService.unlockAccountService({ admin_id: adminId, user_id: userId });
        return res.status(200).json({ status: 'success', message: 'Da mo khoa tai khoan thanh cong!' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getLockedAccounts = async (req, res) => {
    try {
        const adminId = getAdminIdFromToken(req);
        if (!adminId) return res.status(401).json({ status: 'fail', message: 'Unauthorized' });

        const lockedUsers = await adminService.getLockedAccountsService(adminId);
        return res.status(200).json({ status: 'success', data: lockedUsers });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getHiddenPosts = async (req, res) => {
    try {
        const adminId = getAdminIdFromToken(req);
        if (!adminId) return res.status(401).json({ status: 'fail', message: 'Unauthorized' });

        const hiddenPosts = await adminService.getHiddenPostsService(adminId);
        return res.status(200).json({ status: 'success', data: hiddenPosts });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const restorePost = async (req, res) => {
    try {
        const adminId = getAdminIdFromToken(req);
        if (!adminId) return res.status(401).json({ status: 'fail', message: 'Unauthorized' });

        await adminService.restorePostService({ admin_id: adminId, id: req.params.id });
        return res.status(200).json({ status: 'success', message: 'Da khoi phuc bai viet thanh cong!' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getUsers = async (req, res) => {
    try {
        const adminId = getAdminIdFromToken(req);
        if (!adminId) return res.status(401).json({ status: 'fail', message: 'Unauthorized' });

        const users = await adminService.getUsersService({
            admin_id: adminId,
            search: req.query?.search
        });
        return res.status(200).json({ status: 'success', data: users });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const updateUser = async (req, res) => {
    try {
        const adminId = getAdminIdFromToken(req);
        if (!adminId) return res.status(401).json({ status: 'fail', message: 'Unauthorized' });

        await adminService.updateUserService({ admin_id: adminId, id: req.params.id }, req.body);
        return res.status(200).json({ status: 'success', message: 'Cap nhat thong tin nguoi dung thanh cong!' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const deleteUser = async (req, res) => {
    try {
        const adminId = getAdminIdFromToken(req);
        if (!adminId) return res.status(401).json({ status: 'fail', message: 'Unauthorized' });

        await adminService.deleteUserService({ admin_id: adminId, id: req.params.id });
        return res.status(200).json({ status: 'success', message: 'Da xoa nguoi dung thanh cong!' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

module.exports = {
    getStats,
    unlockAccount,
    getLockedAccounts,
    getHiddenPosts,
    restorePost,
    getUsers,
    updateUser,
    deleteUser
};
