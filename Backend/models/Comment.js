const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
    post: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Post', 
        required: true 
    },
    author: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Account', 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    image_url: { 
        type: String, 
        default: '' // Khu vực bình luận có thể chứa ảnh
    },
    upvotes: { 
        type: Number, 
        default: 0 
    },
    downvotes: { 
        type: Number, 
        default: 0 
    },
    reactions: [{
        user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Account' },
        type: { type: String, default: 'up' }
    }],
    created_at: { 
        type: Date, 
        default: Date.now 
    }
}, { collection: 'Comments' });

commentSchema.index({ post: 1, upvotes: -1, created_at: -1 });
commentSchema.index({ post: 1, created_at: -1 });
commentSchema.index({ author: 1, created_at: -1 });

module.exports = mongoose.model('Comment', commentSchema);
