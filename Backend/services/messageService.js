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

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif'];
const VIDEO_EXTENSIONS = ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'];

const getUrlExtension = (url) => {
    if (typeof url !== 'string') return '';
    const safeUrl = url.split('?')[0].split('#')[0];
    const segments = safeUrl.split('.');
    if (segments.length < 2) return '';
    return String(segments.pop() || '').toLowerCase();
};

const inferAttachmentKind = ({ url = '', mimeType = '', declaredKind = '' }) => {
    const kind = String(declaredKind || '').trim().toLowerCase();
    if (kind === 'image' || kind === 'video' || kind === 'file') return kind;

    const mime = String(mimeType || '').trim().toLowerCase();
    if (mime.startsWith('image/')) return 'image';
    if (mime.startsWith('video/')) return 'video';

    const extension = getUrlExtension(url);
    if (IMAGE_EXTENSIONS.includes(extension)) return 'image';
    if (VIDEO_EXTENSIONS.includes(extension)) return 'video';
    return 'file';
};

const buildAttachmentFromString = (url) => {
    const normalizedUrl = typeof url === 'string' ? url.trim() : '';
    if (!normalizedUrl) return null;
    return {
        url: normalizedUrl,
        kind: inferAttachmentKind({ url: normalizedUrl })
    };
};

const buildAttachmentFromObject = (attachment) => {
    if (!attachment || typeof attachment !== 'object') return null;

    const url = typeof attachment.url === 'string'
        ? attachment.url.trim()
        : (typeof attachment.path === 'string' ? attachment.path.trim() : '');

    if (!url) return null;

    const mimeType = typeof attachment.mime_type === 'string'
        ? attachment.mime_type.trim()
        : (typeof attachment.mimeType === 'string' ? attachment.mimeType.trim() : '');

    const kind = inferAttachmentKind({
        url,
        mimeType,
        declaredKind: attachment.kind || attachment.type
    });

    const normalized = { url, kind };
    if (typeof attachment.name === 'string' && attachment.name.trim()) {
        normalized.name = attachment.name.trim();
    }
    if (mimeType) {
        normalized.mime_type = mimeType;
    }
    if (Number.isFinite(attachment.size) && attachment.size > 0) {
        normalized.size = Number(attachment.size);
    }
    return normalized;
};

const normalizeAttachments = (attachments) => {
    if (!Array.isArray(attachments)) return [];
    return attachments
        .map((attachment) => {
            if (typeof attachment === 'string') return buildAttachmentFromString(attachment);
            if (attachment && typeof attachment === 'object') return buildAttachmentFromObject(attachment);
            return null;
        })
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
            throw createHttpError('Nguoi dung khong hop le');
        }

        const conversations = await Conversation.find({
            participants: normalizedUserId
        })
            .populate('participants', 'username full_name avatar_url')
            .populate('last_message')
            .sort({ updated_at: -1 })
            .lean();

        const conversationIds = conversations.map((conv) => conv?._id).filter(Boolean);
        const unreadRows = conversationIds.length
            ? await Message.aggregate([
                {
                    $match: {
                        conversation: { $in: conversationIds },
                        recipient: new mongoose.Types.ObjectId(normalizedUserId),
                        is_read: false
                    }
                },
                {
                    $group: {
                        _id: '$conversation',
                        count: { $sum: 1 }
                    }
                }
            ])
            : [];

        const unreadMap = new Map(
            unreadRows.map((row) => [String(row._id), Number(row.count || 0)])
        );

        const conversationsWithUnread = conversations.map((conv) => ({
            ...conv,
            unread_count: unreadMap.get(String(conv._id)) || 0
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


