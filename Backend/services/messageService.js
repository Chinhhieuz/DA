const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Account = require('../models/Account');

const messageService = {
    // Lấy danh sách cuộc hội thoại của user
    getConversations: async (userId) => {
        const conversations = await Conversation.find({
            participants: userId
        })
        .populate('participants', 'username full_name avatar_url')
        .populate('last_message')
        .sort({ updated_at: -1 })
        .lean();

        // Đếm tin nhắn chưa đọc cho từng cuộc hội thoại
        const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversation: conv._id,
                recipient: userId,
                is_read: false
            });
            return {
                ...conv,
                unread_count: unreadCount
            };
        }));

        return conversationsWithUnread;
    },

    // Lấy lịch sử tin nhắn của một cuộc hội thoại (có phân trang)
    getMessages: async (conversationId, limit = 20, before = null) => {
        const query = { conversation: conversationId };
        
        if (before) {
            query.createdAt = { $lt: new Date(before) };
        }

        return await Message.find(query)
            .sort({ createdAt: -1 }) // Lấy mới nhất trước
            .limit(limit)
            .then(msgs => msgs.reverse()); // Sau đó đảo ngược lại để đúng thứ tự thời gian
    },

    // Bắt đầu hoặc tìm cuộc hội thoại với một user khác
    startConversation: async (senderId, recipientId) => {
        // Kiểm tra xem đã có cuộc hội thoại chưa
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] }
        })
        .populate('participants', 'username full_name avatar_url')
        .populate('last_message');

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, recipientId]
            });
            // Re-fetch to populate
            conversation = await Conversation.findById(conversation._id)
                .populate('participants', 'username full_name avatar_url');
        }

        return conversation;
    },

    // Lưu tin nhắn mới
    saveMessage: async (senderId, recipientId, content, attachments = []) => {
        // Tìm hoặc tạo conversation
        let conversation = await Conversation.findOne({
            participants: { $all: [senderId, recipientId] }
        });

        if (!conversation) {
            conversation = await Conversation.create({
                participants: [senderId, recipientId]
            });
        }

        let message = await Message.create({
            conversation: conversation._id,
            sender: senderId,
            recipient: recipientId,
            content: content,
            attachments: attachments
        });

        // Cập nhật last_message và updated_at cho conversation
        conversation.last_message = message._id;
        conversation.updated_at = Date.now();
        await conversation.save();

        return message;
    },

    // Đánh dấu đã đọc toàn bộ tin nhắn trong cuộc hội thoại
    markAsRead: async (conversationId, userId) => {
        const mongoose = require('mongoose');
        const result = await Message.updateMany(
            { 
                conversation: new mongoose.Types.ObjectId(conversationId), 
                recipient: new mongoose.Types.ObjectId(userId), 
                is_read: false 
            },
            { $set: { is_read: true } }
        );
        console.log(`[MESSAGES] ✅ Đã đánh dấu ${result.modifiedCount} tin nhắn là đã đọc trong Room: ${conversationId}`);
        return result;
    },

    // Thu hồi tin nhắn
    revokeMessage: async (messageId, userId) => {
        const message = await Message.findById(messageId);
        if (!message) throw new Error('Không tìm thấy tin nhắn');

        // Chỉ người gửi mới có quyền thu hồi
        if (String(message.sender) !== String(userId)) {
            throw new Error('Bạn không có quyền thu hồi tin nhắn này');
        }

        message.is_revoked = true;
        // Xóa nội dung để bảo mật/tiết kiệm dung lượng nếu cần, tùy bạn
        // message.content = 'Tin nhắn đã được thu hồi'; 
        await message.save();

        return message;
    },

    // Chia sẻ tin nhắn
    shareMessage: async (messageId, senderId, recipientId) => {
        const originalMessage = await Message.findById(messageId);
        if (!originalMessage) throw new Error('Không tìm thấy tin nhắn để chia sẻ');

        // Tạo tin nhắn mới từ nội dung tin nhắn cũ
        return await messageService.saveMessage(
            senderId, 
            recipientId, 
            originalMessage.content, 
            originalMessage.attachments
        );
    },
    
    // Đếm tổng số tin nhắn chưa đọc của user
    getTotalUnreadCount: async (userId) => {
        return await Message.countDocuments({
            recipient: userId,
            is_read: false
        });
    }
};

module.exports = messageService;
