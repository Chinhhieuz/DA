const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    password_hash: { 
        type: String, 
        required: true 
    },
    role: { 
        type: String, 
        default: 'User' 
    },
    full_name: { 
        type: String 
    },
    mssv: { 
        type: String 
    },
    avatar_url: { 
        type: String 
    },
    bio: { 
        type: String 
    },
    location: { 
        type: String 
    },
    website: { 
        type: String 
    },
    resetPasswordToken: {
        type: String
    },
    resetPasswordExpires: {
        type: Date
    },
    preferences: {
        darkMode: { type: Boolean, default: false },
        pushNotifications: { type: Boolean, default: true },
        commentNotifications: { type: Boolean, default: true }
    },
    friends: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Account' 
    }],
    friendRequests: {
        sent: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }],
        received: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Account' }]
    },
    followers: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Account' 
    }],
    following: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Account' 
    }],
    savedPosts: [{ 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Post' 
    }],
    created_at: { 
        type: Date, 
        default: Date.now 
    },
    warning_count: { type: Number, default: 0 },
    is_locked: { type: Boolean, default: false },
    lock_until: { type: Date },
    lock_reason: { type: String },
    unlock_ticket: {
        content: String,
        status: { type: String, enum: ['none', 'pending', 'resolved'], default: 'none' },
        created_at: { type: Date }
    }
}, { 
    // Chỉ định rõ tên collection là "Account" để khớp với format trên MongoDB
    collection: 'Account' 
});

module.exports = mongoose.model('Account', accountSchema);
