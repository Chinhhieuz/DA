const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Account',
        required: true
    }],
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

module.exports = mongoose.model('Conversation', conversationSchema);
