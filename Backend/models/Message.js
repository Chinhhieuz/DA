const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    },
    content: {
        type: String,
        required: false, // Make it optional if image is present
        trim: true
    },
    attachments: [{
        type: mongoose.Schema.Types.Mixed
    }],
    is_read: {
        type: Boolean,
        default: false
    },
    is_revoked: {
        type: Boolean,
        default: false
    },
    is_shared: {
        type: Boolean,
        default: false
    },
    created_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'Messages'
});

// Index để tìm nhanh tin nhắn trong cuộc hội thoại
messageSchema.index({ conversation: 1, created_at: 1 });

module.exports = mongoose.model('Message', messageSchema);
