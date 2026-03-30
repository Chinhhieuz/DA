const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    post: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Post', 
        required: true 
    },
    reporter: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Account', 
        required: true 
    },
    reason: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['pending', 'resolved', 'dismissed'],
        default: 'pending' 
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    }
}, { collection: 'Reports' });

module.exports = mongoose.model('Report', reportSchema);
