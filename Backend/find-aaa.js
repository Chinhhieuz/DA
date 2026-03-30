const mongoose = require('mongoose');
const Comment = require('./models/Comment');
require('dotenv').config();

async function findComment() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const comment = await Comment.findOne({ content: 'aaa' }).populate('author');
        if (comment) {
            console.log('Found comment:', JSON.stringify(comment, null, 2));
        } else {
            console.log('Comment not found');
        }
        process.exit();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

findComment();
