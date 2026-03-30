const mongoose = require('mongoose');
const Comment = require('./models/Comment');
const Thread = require('./models/Thread');
const Post = require('./models/Post');
const Account = require('./models/Account');
require('dotenv').config();

async function verify() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // 1. Get a user and a post
        const account = await Account.findOne();
        const post = await Post.findOne();
        if (!account || !post) {
            console.error('❌ Need at least one account and one post in DB');
            process.exit(1);
        }

        const authorId = account._id;
        const postId = post._id;

        // 2. Create a comment
        const comment = new Comment({
            post: postId,
            author: authorId,
            content: 'Verification comment'
        });
        await comment.save();
        console.log('✅ Created comment:', comment._id);

        // 3. Create a thread for that comment
        const thread = new Thread({
            comment: comment._id,
            author: authorId,
            content: 'Verification thread'
        });
        await thread.save();
        console.log('✅ Created thread:', thread._id);

        // 4. Call the controller function directly (to verify logic)
        // Or just use the API but with this valid user
        const commentId = comment._id;
        
        console.log('5. Testing DELETE /api/comments/' + commentId);
        const res = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: authorId.toString() })
        });
        const data = await res.json();
        console.log('Response:', data);

        if (data.status === 'success') {
            const deletedComment = await Comment.findById(commentId);
            const deletedThread = await Thread.findOne({ comment: commentId });
            if (!deletedComment && !deletedThread) {
                console.log('✅ Verification SUCCESS: Comment and thread deleted!');
            } else {
                console.error('❌ Verification FAILED: Comment or thread still exists');
            }
        } else {
            console.error('❌ API call failed');
        }

        process.exit();
    } catch (err) {
        console.error('🚨 Error:', err);
        process.exit(1);
    }
}

verify();
