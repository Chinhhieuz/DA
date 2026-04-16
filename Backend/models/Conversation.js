const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    }],
    conversation_key: {
        type: String
    },
    last_message: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true,
    collection: 'Conversations'
});

// Index để tìm nhanh cuộc hội thoại giữa 2 người
conversationSchema.index({ participants: 1 });
// Khóa hội thoại 1-1 để tránh tạo trùng khi nhiều request song song
conversationSchema.index({ conversation_key: 1 }, { unique: true, sparse: true });

conversationSchema.index({ participants: 1, updated_at: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
