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
    }
}, { collection: 'Posts' });

module.exports = mongoose.model('Post', postSchema);
