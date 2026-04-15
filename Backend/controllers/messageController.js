const messageService = require('../services/messageService');
const socketModule = require('../socket');
const Conversation = require('../models/Conversation');
const cloudinary = require('cloudinary').v2;
const path = require('path');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const inferAttachmentKind = (mimeType = '', fallbackName = '') => {
    const normalizedMime = String(mimeType || '').toLowerCase();
    if (normalizedMime.startsWith('image/')) return 'image';
    if (normalizedMime.startsWith('video/')) return 'video';

    const extension = String(fallbackName || '').split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'avif', 'heic', 'heif'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v', '3gp'].includes(extension)) return 'video';
    return 'file';
};

const resolveCloudinaryResourceType = (kind) => {
    if (kind === 'image') return 'image';
    if (kind === 'video') return 'video';
    return 'raw';
};

const buildCloudinaryUploadOptions = ({ resourceType, originalName = '' }) => {
    const normalizedOriginalName = String(originalName || '').trim();
    const extension = path.extname(normalizedOriginalName).replace(/^\./, '').toLowerCase();
    const options = {
        folder: 'social-media-message-uploads',
        resource_type: resourceType,
        use_filename: true,
        unique_filename: true
    };

    if (normalizedOriginalName) {
        options.filename_override = normalizedOriginalName;
    }

    // Raw files can lose extension on delivery URL if we do not specify format.
    if (resourceType === 'raw' && extension) {
        options.format = extension;
    }

    return options;
};

const uploadBufferToCloudinary = (fileBuffer, { resourceType, originalName } = {}) => {
    const uploadOptions = buildCloudinaryUploadOptions({ resourceType, originalName });
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
                if (error) return reject(error);
                return resolve(result);
            }
        );
        stream.end(fileBuffer);
    });
};

const normalizeId = (value) => {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number') return String(value);
    if (typeof value === 'object') {
        if (typeof value.$oid === 'string') return value.$oid.trim();
        if (value._id !== undefined && value._id !== value) {
            const nested = normalizeId(value._id);
            if (nested) return nested;
        }
        if (typeof value.id === 'string' || typeof value.id === 'number') {
            const direct = String(value.id).trim();
            if (direct) return direct;
        }
        if (typeof value.toHexString === 'function') {
            const hex = value.toHexString();
            if (typeof hex === 'string' && hex.trim()) return hex.trim();
        }
        if (typeof value.toString === 'function') {
            const raw = value.toString().trim();
            if (raw && raw !== '[object Object]') return raw;
        }
    }
    return '';
};

const serializeMessage = (message) => {
    const raw = message && typeof message.toObject === 'function' ? message.toObject() : message;
    if (!raw) return raw;

    return {
        ...raw,
        _id: normalizeId(raw._id),
        conversation: normalizeId(raw.conversation),
        sender: normalizeId(raw.sender),
        recipient: normalizeId(raw.recipient)
    };
};

const messageController = {
    // API: get all conversations
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

    // API: get messages in one conversation
    getMessages: async (req, res, next) => {
        try {
            const { conversationId } = req.params;
            const { limit, before } = req.query;
            const userId = req.user.id;
            const messages = await messageService.getMessages(conversationId, userId, limit, before);
            res.status(200).json({
                status: 'success',
                data: messages
            });
        } catch (error) {
            next(error);
        }
    },

    uploadAttachment: async (req, res, next) => {
        try {
            const file = req.file;
            if (!file) {
                return res.status(400).json({
                    status: 'fail',
                    message: 'Khong tim thay tep dinh kem'
                });
            }

            const kind = inferAttachmentKind(file.mimetype, file.originalname);
            const resourceType = resolveCloudinaryResourceType(kind);
            const uploadResult = await uploadBufferToCloudinary(file.buffer, {
                resourceType,
                originalName: file.originalname
            });
            const fileUrl = uploadResult?.secure_url || uploadResult?.url;

            if (!fileUrl) {
                return res.status(500).json({
                    status: 'error',
                    message: 'Khong the tai tep len cloud'
                });
            }

            return res.status(200).json({
                status: 'success',
                data: {
                    attachment: {
                        url: fileUrl,
                        kind,
                        name: file.originalname || '',
                        mime_type: file.mimetype || '',
                        size: file.size || 0
                    }
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // API: send message
    sendMessage: async (req, res, next) => {
        try {
            const senderId = req.user.id;
            const { recipientId, content, attachments, conversationId } = req.body;
            const message = await messageService.saveMessage(senderId, recipientId, content, attachments, {
                conversationId
            });
            const messagePayload = serializeMessage(message);

            try {
                const io = socketModule.getIO();
                const senderRoom = String(senderId);
                const recipientRoom = String(messagePayload.recipient);

                console.log(`[MESSAGES] Emitting receive_message from ${senderRoom} to ${recipientRoom}`);

                io.to(senderRoom).emit('receive_message', messagePayload);
                if (senderRoom !== recipientRoom) {
                    io.to(recipientRoom).emit('receive_message', messagePayload);
                }
            } catch (socketError) {
                console.error('[MESSAGES] Socket broadcast error (sendMessage):', socketError.message);
            }

            res.status(201).json({
                status: 'success',
                data: messagePayload
            });
        } catch (error) {
            next(error);
        }
    },

    // API: start direct chat
    startChat: async (req, res, next) => {
        try {
            const senderIdFromQuery = normalizeId(req.query?.userId || req.body?.userId);
            const senderId = senderIdFromQuery || normalizeId(req.user?.id || req.user?._id);
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

    // API: mark messages as read
    markAsRead: async (req, res, next) => {
        try {
            const { conversationId } = req.params;
            const userId = req.user.id;
            const result = await messageService.markAsRead(conversationId, userId);

            try {
                const io = socketModule.getIO();
                const conversation = await Conversation.findById(conversationId).select('participants');
                if (conversation) {
                    conversation.participants.forEach((participantId) => {
                        io.to(String(participantId)).emit('messages_seen', {
                            conversationId: String(conversationId),
                            seenBy: String(userId),
                            modifiedCount: result.modifiedCount || 0,
                            readAt: new Date().toISOString()
                        });
                    });
                }
            } catch (socketError) {
                console.error('[MESSAGES] Socket broadcast error (markAsRead):', socketError.message);
            }

            res.status(200).json({
                status: 'success',
                message: 'Da danh dau da doc'
            });
        } catch (error) {
            next(error);
        }
    },

    // API: revoke message
    revokeMessage: async (req, res, next) => {
        try {
            const { messageId } = req.params;
            const userId = req.user.id;
            const message = await messageService.revokeMessage(messageId, userId);

            try {
                const io = socketModule.getIO();
                const conversationId = message.conversation;
                const conv = await Conversation.findById(conversationId).select('participants');
                if (conv) {
                    conv.participants.forEach((participantId) => {
                        io.to(String(participantId)).emit('message_revoked', {
                            messageId: normalizeId(message._id),
                            conversationId: normalizeId(conv._id),
                            revokedAt: message.updatedAt
                        });
                    });
                }
            } catch (socketError) {
                console.error('[MESSAGES] Socket broadcast error (revokeMessage):', socketError.message);
            }

            res.status(200).json({
                status: 'success',
                data: serializeMessage(message)
            });
        } catch (error) {
            next(error);
        }
    },

    // API: share message
    shareMessage: async (req, res, next) => {
        try {
            const senderId = req.user.id;
            const { messageId, recipientId } = req.body;
            const message = await messageService.shareMessage(messageId, senderId, recipientId);
            const messagePayload = serializeMessage(message);

            try {
                const io = socketModule.getIO();
                const senderRoom = String(senderId);
                const recipientRoom = String(messagePayload.recipient);
                io.to(senderRoom).emit('receive_message', messagePayload);
                if (senderRoom !== recipientRoom) {
                    io.to(recipientRoom).emit('receive_message', messagePayload);
                }
            } catch (socketError) {
                console.error('[MESSAGES] Socket broadcast error (shareMessage):', socketError.message);
            }

            res.status(201).json({
                status: 'success',
                data: messagePayload
            });
        } catch (error) {
            next(error);
        }
    },

    // API: delete conversation
    deleteConversation: async (req, res, next) => {
        try {
            const { conversationId } = req.params;
            const userId = req.user.id;
            const { partnerId } = req.query;
            const result = await messageService.deleteConversation(conversationId, userId, {
                partnerId
            });
            const deletedConversationIds = Array.isArray(result.conversationIds) && result.conversationIds.length
                ? result.conversationIds
                : [String(result.conversationId)].filter(Boolean);

            try {
                const io = socketModule.getIO();
                (result.participantIds || []).forEach((participantId) => {
                    deletedConversationIds.forEach((deletedConversationId) => {
                        io.to(String(participantId)).emit('conversation_deleted', {
                            conversationId: String(deletedConversationId),
                            deletedBy: String(userId),
                            deletedAt: new Date().toISOString()
                        });
                    });
                });
            } catch (socketError) {
                console.error('[MESSAGES] Socket broadcast error (deleteConversation):', socketError.message);
            }

            res.status(200).json({
                status: 'success',
                message: 'Da xoa cuoc tro chuyen',
                data: {
                    conversationId: String(result.conversationId),
                    conversationIds: deletedConversationIds,
                    deletedConversations: result.deletedConversations || deletedConversationIds.length,
                    deletedMessages: result.deletedMessages || 0
                }
            });
        } catch (error) {
            next(error);
        }
    },

    // API: get total unread count
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
