const notificationService = require('../services/notificationService');

const getNotifications = async (req, res) => {
    try {
        const accountId = String(req.user?.id || req.user?._id || '').trim();
        if (!accountId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        res.set('Cache-Control', 'no-store');
        const notifications = await notificationService.getNotificationsService(accountId);
        return res.status(200).json({ status: 'success', data: notifications });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const getUnreadCount = async (req, res) => {
    try {
        const accountId = String(req.user?.id || req.user?._id || '').trim();
        if (!accountId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        res.set('Cache-Control', 'no-store');
        const count = await notificationService.getUnreadCountService(accountId);
        return res.status(200).json({ status: 'success', data: count });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const accountId = String(req.user?.id || req.user?._id || '').trim();
        if (!accountId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const updated = await notificationService.markAsReadService(req.params.id, accountId);
        if (!updated) {
            return res.status(404).json({ status: 'fail', message: 'Notification not found' });
        }
        return res.status(200).json({ status: 'success', message: 'Marked as read' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const accountId = String(req.user?.id || req.user?._id || '').trim();
        if (!accountId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const updatedCount = await notificationService.markAllAsReadService(accountId);
        return res.status(200).json({
            status: 'success',
            message: 'Marked all as read',
            data: { updatedCount }
        });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    getNotifications,
    getUnreadCount,
    markAsRead,
    markAllAsRead
};
