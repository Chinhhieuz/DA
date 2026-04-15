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
                senderName = senderAcc.display_name || senderAcc.username;
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
        .populate('sender', 'username display_name avatar_url full_name')
        .populate('post', 'title');
    return notifications;
};

const markAsReadService = async (id) => {
    await Notification.findByIdAndUpdate(id, { isRead: true });
};

const markAllAsReadService = async (accountId) => {
    await Notification.updateMany({ recipient: accountId, isRead: false }, { isRead: true });
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
    markAsReadService,
    markAllAsReadService,
    deleteNotificationsByPost,
    deleteNotificationsByComment,
    deleteNotificationsByThread
};
