const Notification = require('../models/Notification');
const Account = require('../models/Account');
const socketModule = require('../socket');

const sendSocketEvent = (recipientId, eventName, payload) => {
    try {
        const io = socketModule.getIO ? socketModule.getIO() : null;
        
        if (io) {
            const rIdStr = recipientId.toString();
            // Emit to the user's room (multi-tab support)
            io.to(rIdStr).emit(eventName, payload);
            console.log(`📡 [NOTIF] Gửi ${eventName} tới Room: ${rIdStr}`);
            return true;
        }
        return false;
    } catch (e) {
        console.error('[SOCKET EMIT ERROR]', e);
        return false;
    }
};

const createAndPushNotification = async ({ recipient, sender, type, post, comment, thread, content, customPayload }) => {
    try {
        const recipientAcc = await Account.findById(recipient);
        if (!recipientAcc) return null;

        if (type === 'comment' && recipientAcc.preferences?.commentNotifications === false) return null;
        if (type === 'like' && recipientAcc.preferences?.pushNotifications === false) return null;

        const notif = new Notification({
            recipient,
            sender,
            type,
            post,
            comment,
            thread,
            content
        });
        await notif.save();

        let senderName = 'Hệ thống Admin';
        let senderData = { username: 'Admin', avatar_url: '' };
        if (sender) {
            const senderAcc = await Account.findById(sender);
            if (senderAcc) {
                senderName = senderAcc.full_name || senderAcc.username;
                senderData = { username: senderAcc.username, avatar_url: senderAcc.avatar_url };
            }
        }

        const payload = {
            id: notif._id,
            type: notif.type,
            content: notif.content,
            senderName,
            sender: senderData,
            postId: post,
            created_at: notif.created_at,
            ...customPayload
        };

        sendSocketEvent(recipient, 'new_notification', payload);
        return notif;
    } catch (error) {
        console.error('[NOTIFICATION SERVICE] Error:', error);
        return null;
    }
};

const getNotificationsService = async (accountId) => {
    const notifications = await Notification.find({ recipient: accountId })
        .sort({ created_at: -1 })
        .populate('sender', 'username full_name avatar_url')
        .populate('post', 'title');
    return notifications;
};

const getUnreadCountService = async (accountId) => {
    return Notification.countDocuments({
        recipient: accountId,
        isRead: false
    });
};

const markAsReadService = async (id, accountId) => {
    const filter = accountId
        ? { _id: id, recipient: accountId }
        : { _id: id };
    const result = await Notification.updateOne(filter, { $set: { isRead: true } });
    return result.modifiedCount > 0;
};

const markAllAsReadService = async (accountId) => {
    const result = await Notification.updateMany({ recipient: accountId, isRead: false }, { isRead: true });
    return Number(result.modifiedCount || 0);
};

const deleteNotificationsByPost = async (postId) => {
    await Notification.deleteMany({ post: postId });
};

const deleteNotificationsByComment = async (commentId) => {
    await Notification.deleteMany({ comment: commentId });
};

const deleteNotificationsByThread = async (threadId) => {
    await Notification.deleteMany({ thread: threadId });
};

module.exports = {
    sendSocketEvent,
    createAndPushNotification,
    getNotificationsService,
    getUnreadCountService,
    markAsReadService,
    markAllAsReadService,
    deleteNotificationsByPost,
    deleteNotificationsByComment,
    deleteNotificationsByThread
};
