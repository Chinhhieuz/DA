const Account = require('../models/Account');
const Notification = require('../models/Notification');
const socketModule = require('../socket');

/**
 * Phân tích nội dung để tìm @username và gửi thông báo nhắc tên
 * @param {string} content Nội dung bình luận/phản hồi
 * @param {string} senderId ID người gửi
 * @param {string} postId ID bài viết liên quan
 * @param {string} postTitle Tiêu đề bài viết
 */
const processMentions = async (content, senderId, postId, postTitle) => {
    try {
        // Tìm toàn bộ @username (chỉ lấy chữ cái, số và dấu gạch dưới)
        const mentionRegex = /@(\w+)/g;
        const matches = [...content.matchAll(mentionRegex)];
        
        if (matches.length === 0) return;

        // Lấy danh sách username duy nhất (loại bỏ trùng lặp)
        const usernames = [...new Set(matches.map(match => match[1]))];
        
        // Tìm thông tin người gửi để lấy tên hiển thị
        const sender = await Account.findById(senderId);
        if (!sender) return;

        for (const username of usernames) {
            // Tìm người dùng được nhắc tên
            const recipient = await Account.findOne({ username });
            
            // Không gửi thông báo nếu người dùng không tồn tại hoặc tự nhắc tên chính mình
            if (!recipient || recipient._id.toString() === senderId) continue;

            // Tạo thông báo mới
            const notif = new Notification({
                recipient: recipient._id,
                sender: senderId,
                type: 'mention',
                post: postId,
                content: content.substring(0, 100) // Lấy một đoạn nội dung
            });
            await notif.save();

            // Gửi qua Socket.io nếu người dùng đang online
            const io = socketModule.getIO();
            const connectedUsers = socketModule.getConnectedUsers();
            const recipientSocketId = connectedUsers.get(recipient._id.toString());
            
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('new_notification', {
                    type: 'mention',
                    senderName: sender.display_name || sender.username,
                    postId: postId,
                    title: postTitle,
                    content: content.substring(0, 50)
                });
            }
        }
    } catch (error) {
        console.error('[MENTION UTILS] Lỗi khi xử lý nhắc tên:', error);
    }
};

module.exports = { processMentions };
