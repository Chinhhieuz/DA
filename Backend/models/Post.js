const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    author: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Account', 
        required: true 
    },
    community: { 
        type: String, 
        default: 'Chung' 
    },
    title: { 
        type: String, 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    image_url: { 
        type: String, 
        default: '' // Khu vực có thể có ảnh (lưu URL ảnh)
    },
    image_urls: [{ 
        type: String 
    }],
    video_url: {
        type: String,
        default: ''
    },
    reactions: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
        type: { type: String, default: '👍' }
    }],
    upvotes: { 
        type: Number, 
        default: 0 
    },
    downvotes: { 
        type: Number, 
        default: 0 
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    },
    status: {
        type: String,
        enum: ['pending', 'approved', 'rejected', 'hidden'],
        default: 'pending'
    },
    ai_system_note: {
        type: String,
        default: ''
    }
}, { collection: 'Posts' });

// 🧹 TỰ ĐỘNG XÓA BÀI VIẾT (TTL INDEX):
// Tự động xóa bài viết sau 30 ngày (2,592,000 giây) nếu status là 'pending' hoặc 'rejected'
postSchema.index({ created_at: 1 }, { 
    expireAfterSeconds: 30 * 24 * 60 * 60, 
    partialFilterExpression: { 
        status: { $in: ['pending', 'rejected'] } 
    } 
});

module.exports = mongoose.model('Post', postSchema);
