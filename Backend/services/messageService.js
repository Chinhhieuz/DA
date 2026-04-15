const mongoose = require('mongoose');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Account = require('../models/Account');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const createHttpError = (message, statusCode = 400, status = 'fail') => {
    const error = new Error(message);
    error.statusCode = statusCode;
    error.status = status;
    return error;
};

const normalizeId = (value) => String(value || '').trim();
const isValidObjectId = (value) => mongoose.Types.ObjectId.isValid(normalizeId(value));

const parseLimit = (limit) => {
    const parsed = Number.parseInt(String(limit), 10);
    if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_LIMIT;
    return Math.min(parsed, MAX_LIMIT);
};

const parseBeforeDate = (before) => {
    if (!before) return null;
    const parsedDate = new Date(before);
    if (Number.isNaN(parsedDate.getTime())) {
        throw createHttpError('Mốc thời gian phân trang không hợp lệ');
    }
    return parsedDate;
};

const normalizeContent = (content) => {
    if (typeof content !== 'string') return '';
    return content.trim();
};

const normalizeAttachments = (attachments) => {
    if (!Array.isArray(attachments)) return [];
    return attachments
        .map((attachment) => (typeof attachment === 'string' ? attachment.trim() : ''))
        .filter(Boolean);
};

const getConversationParticipantIds = (conversation) => {
    const participants = Array.isArray(conversation?.participants) ? conversation.participants : [];
    return participants.map((participantId) => String(participantId));
};

const resolveRecipientFromConversation = async (conversationId, senderId, recipientId) => {
    const normalizedConversationId = normalizeId(conversationId);
    if (!normalizedConversationId) {
        return { conversation: null, resolvedRecipientId: normalizeId(recipientId) };
    }

    if (!isValidObjectId(normalizedConversationId)) {
        throw createHttpError('Cuộc trò chuyện không hợp lệ');
    }

    const conversation = await Conversation.findById(normalizedConversationId).select('_id participants');
    if (!conversation) {
        throw createHttpError('Không tìm thấy cuộc trò chuyện', 404);
    }

    const participantIds = getConversationParticipantIds(conversation);
    if (!participantIds.includes(String(senderId))) {
        throw createHttpError('Bạn không có quyền gửi vào cuộc trò chuyện này', 403);
    }

    const otherParticipantIds = participantIds.filter((id) => id !== String(senderId));
    if (otherParticipantIds.length === 1) {
        return {
            conversation,
            resolvedRecipientId: otherParticipantIds[0]
        };
    }

    const normalizedRecipientId = normalizeId(recipientId);
    if (!normalizedRecipientId) {
        throw createHttpError('Người nhận không hợp lệ');
    }

    return {
        conversation,
        resolvedRecipientId: normalizedRecipientId
    };
};

const ensureValidDirectParticipants = async (senderId, recipientId) => {
    const normalizedSenderId = normalizeId(senderId);
    const normalizedRecipientId = normalizeId(recipientId);

    if (!isValidObjectId(normalizedSenderId)) {
        throw createHttpError('Người gửi không hợp lệ');
    }

    if (!isValidObjectId(normalizedRecipientId)) {
        throw createHttpError('Người nhận không hợp lệ');
    }

    if (normalizedSenderId === normalizedRecipientId) {
        throw createHttpError('Không thể tự nhắn tin cho chính mình');
    }

    const recipientExists = await Account.exists({ _id: normalizedRecipientId });
    if (!recipientExists) {
        throw createHttpError('Không tìm thấy người nhận', 404);
    }

    return { normalizedSenderId, normalizedRecipientId };
};

const buildConversationKey = (senderId, recipientId) => {
    return [String(senderId), String(recipientId)].sort().join(':');
};

const findLatestDirectConversation = async (senderId, recipientId) => {
    return Conversation.findOne({
        participants: { $all: [senderId, recipientId], $size: 2 }
    }).sort({ updated_at: -1 });
};

const findOrCreateDirectConversation = async (senderId, recipientId) => {
    const conversationKey = buildConversationKey(senderId, recipientId);

    let conversation = await Conversation.findOne({ conversation_key: conversationKey });

    if (!conversation) {
        conversation = await findLatestDirectConversation(senderId, recipientId);
        if (conversation && !conversation.conversation_key) {
            conversation.conversation_key = conversationKey;
            try {
                await conversation.save();
            } catch (error) {
                if (error?.code === 11000) {
                    conversation = await Conversation.findOne({ conversation_key: conversationKey }) || conversation;
                } else {
                    throw error;
                }
            }
        }
    }

    if (!conversation) {
        try {
            conversation = await Conversation.create({
                participants: [senderId, recipientId],
                conversation_key: conversationKey
            });
        } catch (error) {
            if (error?.code === 11000) {
                conversation = await Conversation.findOne({ conversation_key: conversationKey });
            } else {
                throw error;
            }
        }
    }

    return conversation;
};

const messageService = {
    getConversations: async (userId) => {
        const normalizedUserId = normalizeId(userId);
        if (!isValidObjectId(normalizedUserId)) {
            throw createHttpError('Người dùng không hợp lệ');
        }

        const conversations = await Conversation.find({
            participants: normalizedUserId
        })
            .populate('participants', 'username full_name avatar_url')
            .populate('last_message')
            .sort({ updated_at: -1 })
            .lean();

        const conversationsWithUnread = await Promise.all(conversations.map(async (conv) => {
            const unreadCount = await Message.countDocuments({
                conversation: conv._id,
                recipient: normalizedUserId,
                is_read: false
            });
            return {
                ...conv,
                unread_count: unreadCount
            };
        }));

        return conversationsWithUnread;
    },

    getMessages: async (conversationId, userId, limit = DEFAULT_LIMIT, before = null) => {
        const normalizedConversationId = normalizeId(conversationId);
        const normalizedUserId = normalizeId(userId);

        if (!isValidObjectId(normalizedConversationId)) {
            throw createHttpError('Cuộc trò chuyện không hợp lệ');
        }

        if (!isValidObjectId(normalizedUserId)) {
            throw createHttpError('Người dùng không hợp lệ');
        }

        const conversation = await Conversation.findOne({
            _id: normalizedConversationId,
            participants: normalizedUserId
        }).select('_id');

        if (!conversation) {
            throw createHttpError('Bạn không có quyền truy cập cuộc trò chuyện này', 403);
        }

        const query = { conversation: conversation._id };
        const beforeDate = parseBeforeDate(before);
        if (beforeDate) {
            query.createdAt = { $lt: beforeDate };
        }

        return Message.find(query)
            .sort({ createdAt: -1 })
            .limit(parseLimit(limit))
            .then((msgs) => msgs.reverse());
    },

    startConversation: async (senderId, recipientId) => {
        const { normalizedSenderId, normalizedRecipientId } = await ensureValidDirectParticipants(senderId, recipientId);
        const conversation = await findOrCreateDirectConversation(normalizedSenderId, normalizedRecipientId);
        return Conversation.findById(conversation._id)
            .populate('participants', 'username full_name avatar_url')
            .populate('last_message');
    },

    saveMessage: async (senderId, recipientId, content, attachments = [], options = {}) => {
        const conversationId = normalizeId(options.conversationId);
        const {
            conversation: explicitConversation,
            resolvedRecipientId
        } = await resolveRecipientFromConversation(conversationId, senderId, recipientId);

        const { normalizedSenderId, normalizedRecipientId } = await ensureValidDirectParticipants(
            senderId,
            resolvedRecipientId
        );
        const normalizedContent = normalizeContent(content);
        const normalizedAttachments = normalizeAttachments(attachments);

        if (!normalizedContent && normalizedAttachments.length === 0) {
            throw createHttpError('Nội dung tin nhắn không được để trống');
        }

        const conversation = explicitConversation || await findOrCreateDirectConversation(normalizedSenderId, normalizedRecipientId);

        const message = await Message.create({
            conversation: conversation._id,
            sender: normalizedSenderId,
            recipient: normalizedRecipientId,
            content: normalizedContent,
            attachments: normalizedAttachments,
            is_shared: Boolean(options.isShared)
        });

        conversation.last_message = message._id;
        conversation.updated_at = Date.now();
        await conversation.save();

        return message;
    },

    markAsRead: async (conversationId, userId) => {
        const normalizedConversationId = normalizeId(conversationId);
        const normalizedUserId = normalizeId(userId);

        if (!isValidObjectId(normalizedConversationId)) {
            throw createHttpError('Cuộc trò chuyện không hợp lệ');
        }

        if (!isValidObjectId(normalizedUserId)) {
            throw createHttpError('Người dùng không hợp lệ');
        }

        const conversation = await Conversation.findOne({
            _id: normalizedConversationId,
            participants: normalizedUserId
        }).select('_id');

        if (!conversation) {
            throw createHttpError('Bạn không có quyền truy cập cuộc trò chuyện này', 403);
        }

        const result = await Message.updateMany(
            {
                conversation: conversation._id,
                recipient: normalizedUserId,
                is_read: false
            },
            { $set: { is_read: true } }
        );

        console.log(`[MESSAGES] ✅ Đã đánh dấu ${result.modifiedCount} tin nhắn là đã đọc trong Room: ${normalizedConversationId}`);
        return result;
    },

    revokeMessage: async (messageId, userId) => {
        const normalizedMessageId = normalizeId(messageId);
        const normalizedUserId = normalizeId(userId);

        if (!isValidObjectId(normalizedMessageId)) {
            throw createHttpError('Tin nhắn không hợp lệ');
        }

        const message = await Message.findById(normalizedMessageId);
        if (!message) throw createHttpError('Không tìm thấy tin nhắn', 404);

        if (String(message.sender) !== normalizedUserId) {
            throw createHttpError('Bạn không có quyền thu hồi tin nhắn này', 403);
        }

        if (message.is_revoked) return message;

        message.is_revoked = true;
        message.content = '';
        message.attachments = [];
        await message.save();

        return message;
    },

    shareMessage: async (messageId, senderId, recipientId) => {
        const normalizedMessageId = normalizeId(messageId);
        if (!isValidObjectId(normalizedMessageId)) {
            throw createHttpError('Tin nhắn chia sẻ không hợp lệ');
        }

        const originalMessage = await Message.findById(normalizedMessageId);
        if (!originalMessage) throw createHttpError('Không tìm thấy tin nhắn để chia sẻ', 404);
        if (originalMessage.is_revoked) {
            throw createHttpError('Không thể chia sẻ tin nhắn đã thu hồi');
        }

        return messageService.saveMessage(
            senderId,
            recipientId,
            originalMessage.content,
            originalMessage.attachments,
            { isShared: true }
        );
    },
    deleteConversation: async (conversationId, userId, options = {}) => {
        const normalizedConversationId = normalizeId(conversationId);
        const normalizedUserId = normalizeId(userId);
        const normalizedPartnerId = normalizeId(options.partnerId);

        if (!isValidObjectId(normalizedUserId)) {
            throw createHttpError('Nguoi dung khong hop le');
        }

        let conversationsToDelete = [];
        let participantIds = [];

        if (isValidObjectId(normalizedConversationId)) {
            const conversation = await Conversation.findById(normalizedConversationId).select('_id participants');
            if (conversation) {
                const ids = getConversationParticipantIds(conversation);
                if (!ids.includes(normalizedUserId)) {
                    // Ignore stale/foreign conversation id when partnerId is provided;
                    // we can still resolve the real 1-1 conversation by participant pair.
                    if (normalizedPartnerId && isValidObjectId(normalizedPartnerId)) {
                        conversationsToDelete = [];
                    } else {
                        throw createHttpError('Ban khong co quyen xoa cuoc tro chuyen nay', 403);
                    }
                } else {
                    conversationsToDelete = [conversation];
                    participantIds = ids;
                }
            }
        }

        if (conversationsToDelete.length === 0) {
            if (!normalizedPartnerId || !isValidObjectId(normalizedPartnerId)) {
                if (!isValidObjectId(normalizedConversationId)) {
                    throw createHttpError('Cuoc tro chuyen khong hop le');
                }
                const existingConversation = await Conversation.findById(normalizedConversationId).select('_id');
                if (!existingConversation) {
                    throw createHttpError('Khong tim thay cuoc tro chuyen', 404);
                }
                throw createHttpError('Ban khong co quyen xoa cuoc tro chuyen nay', 403);
            }

            if (normalizedPartnerId === normalizedUserId) {
                throw createHttpError('Nguoi dung khong hop le');
            }

            conversationsToDelete = await Conversation.find({
                participants: { $all: [normalizedUserId, normalizedPartnerId], $size: 2 }
            }).select('_id participants');

            if (!conversationsToDelete.length) {
                throw createHttpError('Khong tim thay cuoc tro chuyen', 404);
            }

            participantIds = Array.from(
                new Set(conversationsToDelete.flatMap((conversation) => getConversationParticipantIds(conversation)))
            );
        }

        const conversationIds = conversationsToDelete.map((conversation) => conversation._id);
        const primaryConversationId = conversationIds[0];

        const deletedMessagesResult = await Message.deleteMany({
            conversation: { $in: conversationIds }
        });

        const deletedConversationsResult = await Conversation.deleteMany({
            _id: { $in: conversationIds }
        });

        return {
            conversationId: String(primaryConversationId),
            conversationIds: conversationIds.map((id) => String(id)),
            participantIds,
            deletedMessages: deletedMessagesResult.deletedCount || 0,
            deletedConversations: deletedConversationsResult.deletedCount || conversationsToDelete.length
        };
    },
    getTotalUnreadCount: async (userId) => {
        const normalizedUserId = normalizeId(userId);
        if (!isValidObjectId(normalizedUserId)) {
            throw createHttpError('Người dùng không hợp lệ');
        }

        return Message.countDocuments({
            recipient: normalizedUserId,
            is_read: false
        });
    }
};

module.exports = messageService;

