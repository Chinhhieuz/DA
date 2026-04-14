const messageService = require('../services/messageService');

const messageController = {
    // API: Lấy tất cả cuộc hội thoại
    getConversations: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const conversations = await messageService.getConversations(userId);
            res.status(200).json({
                status: 'success',
                data: conversations
            });
        } catch (error) {
            next(error);
        }
    },

    // API: Lấy tin nhắn trong cuộc hội thoại
    getMessages: async (req, res, next) => {
        try {
            const { conversationId } = req.params;
            const messages = await messageService.getMessages(conversationId);
            res.status(200).json({
                status: 'success',
                data: messages
            });
        } catch (error) {
            next(error);
        }
    },

    // API: Gửi tin nhắn
    sendMessage: async (req, res, next) => {
        try {
            const senderId = req.user.id;
            const { recipientId, content, attachments } = req.body;
            const message = await messageService.saveMessage(senderId, recipientId, content, attachments);
            
            res.status(201).json({
                status: 'success',
                data: message
            });
        } catch (error) {
            next(error);
        }
    },

    // API: Bắt đầu chat với 1 user
    startChat: async (req, res, next) => {
        try {
            const senderId = req.user.id;
            const { userId: recipientId } = req.params;
            const conversation = await messageService.startConversation(senderId, recipientId);
            
            res.status(200).json({
                status: 'success',
                data: conversation
            });
        } catch (error) {
            next(error);
        }
    },

    // API: Đánh dấu đã đọc
    markAsRead: async (req, res, next) => {
        try {
            const { conversationId } = req.params;
            const userId = req.user.id;
            console.log(`[MESSAGES] 📩 Nhận yêu cầu đánh dấu đã đọc cho Room: ${conversationId} từ User: ${userId}`);
            await messageService.markAsRead(conversationId, userId);
            res.status(200).json({
                status: 'success',
                message: 'Đã đánh dấu đã đọc'
            });
        } catch (error) {
            next(error);
        }
    },

    // API: Thu hồi tin nhắn
    revokeMessage: async (req, res, next) => {
        try {
            const { messageId } = req.params;
            const userId = req.user.id;
            const message = await messageService.revokeMessage(messageId, userId);
            
            res.status(200).json({
                status: 'success',
                data: message
            });
        } catch (error) {
            next(error);
        }
    },

    // API: Chia sẻ tin nhắn
    shareMessage: async (req, res, next) => {
        try {
            const senderId = req.user.id;
            const { messageId, recipientId } = req.body;
            const message = await messageService.shareMessage(messageId, senderId, recipientId);
            
            res.status(201).json({
                status: 'success',
                data: message
            });
        } catch (error) {
            next(error);
        }
    },

    // API: Lấy tổng số tin nhắn chưa đọc
    getUnreadCount: async (req, res, next) => {
        try {
            const userId = req.user.id;
            const count = await messageService.getTotalUnreadCount(userId);
            res.status(200).json({
                status: 'success',
                data: count
            });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = messageController;
