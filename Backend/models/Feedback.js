const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Account', 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    type: { 
        type: String, 
        enum: ['suggestion', 'bug', 'other'],
        default: 'suggestion'
    },
    status: { 
        type: String, 
        enum: ['new', 'read', 'archived'],
        default: 'new' 
    },
    created_at: { 
        type: Date, 
        default: Date.now 
    }
}, { collection: 'Feedbacks' });

module.exports = mongoose.model('Feedback', feedbackSchema);
