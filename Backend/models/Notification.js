const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
    type: { type: String, enum: ['like', 'comment', 'friend_request', 'system', 'mention', 'follow'], required: true },
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment' },
    thread: { type: mongoose.Schema.Types.ObjectId, ref: 'Thread' },
    content: { type: String }, 
    isRead: { type: Boolean, default: false },
    created_at: { type: Date, default: Date.now }
}, { collection: 'Notification' });

notificationSchema.index({ recipient: 1, created_at: -1 });
notificationSchema.index({ recipient: 1, isRead: 1, created_at: -1 });
notificationSchema.index({ post: 1 });
notificationSchema.index({ comment: 1 });
notificationSchema.index({ thread: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
