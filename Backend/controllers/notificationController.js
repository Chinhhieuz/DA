const notificationService = require('../services/notificationService');

const getNotifications = async (req, res) => {
    try {
        const { accountId } = req.query;
        if (!accountId) return res.status(400).json({ status: 'fail', message: 'Thiếu accountId' });

        const notifications = await notificationService.getNotificationsService(accountId);
        return res.status(200).json({ status: 'success', data: notifications });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        await notificationService.markAsReadService(req.params.id);
        return res.status(200).json({ status: 'success', message: 'Đã đánh dấu đã đọc' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const { accountId } = req.body;
        await notificationService.markAllAsReadService(accountId);
        return res.status(200).json({ status: 'success', message: 'Đã đánh dấu tất cả là đã đọc' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
