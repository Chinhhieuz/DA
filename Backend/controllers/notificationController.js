const Notification = require('../models/Notification');

const getNotifications = async (req, res) => {
    try {
        const { accountId } = req.query; // Tạm dùng query để nhận accountId (cần middleware sau)
        if (!accountId) return res.status(400).json({ status: 'fail', message: 'Thiếu accountId' });

        const notifications = await Notification.find({ recipient: accountId })
            .sort({ created_at: -1 })
            .populate('sender', 'username display_name avatar_url full_name')
            .populate('post', 'title');

        return res.status(200).json({ status: 'success', data: notifications });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        await Notification.findByIdAndUpdate(id, { isRead: true });
        return res.status(200).json({ status: 'success', message: 'Đã đánh dấu đã đọc' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const markAllAsRead = async (req, res) => {
    try {
        const { accountId } = req.body;
        await Notification.updateMany({ recipient: accountId, isRead: false }, { isRead: true });
        return res.status(200).json({ status: 'success', message: 'Đã đánh dấu tất cả là đã đọc' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = { getNotifications, markAsRead, markAllAsRead };
