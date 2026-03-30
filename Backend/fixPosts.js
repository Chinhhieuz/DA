const mongoose = require('mongoose');
const Post = require('./models/Post');
require('dotenv').config();

async function fixExistingPosts() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/DA');
        console.log('Connected to MongoDB');

        const result = await Post.updateMany(
            { status: { $exists: false } },
            { $set: { status: 'approved' } }
        );

        console.log(`Updated ${result.modifiedCount} posts to 'approved' status.`);
        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

fixExistingPosts();
