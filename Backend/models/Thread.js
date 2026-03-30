const mongoose = require('mongoose');

const threadSchema = new mongoose.Schema({
    comment: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Comment', 
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
        default: '' // Khu vực phản hồi có thể chứa ảnh
    },
    upvotes: { 
        type: Number, 
        default: 0 
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    }
}, { collection: 'Threads' });

module.exports = mongoose.model('Thread', threadSchema);
