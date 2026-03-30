const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/DA/DA/Backend/.env' });

const Post = require('./models/Post');
const Comment = require('./models/Comment');

async function sync() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to DB');

        const posts = await Post.find({});
        console.log(`Syncing ${posts.length} posts...`);

        for (const post of posts) {
            const up = post.reactions.filter(r => r.type === 'up' || r.type === '👍' || r.type === '❤️').length;
            const down = post.reactions.filter(r => r.type === 'down').length;
            
            if (post.upvotes !== up || post.downvotes !== down) {
                post.upvotes = up;
                post.downvotes = down;
                await post.save();
                console.log(`Updated Post: ${post.title} (Up: ${up}, Down: ${down})`);
            }
        }

        const comments = await Comment.find({});
        console.log(`Syncing ${comments.length} comments...`);

        for (const comment of comments) {
            const up = comment.reactions.filter(r => r.type === 'up' || r.type === '👍' || r.type === '❤️').length;
            const down = comment.reactions.filter(r => r.type === 'down').length;
            
            if (comment.upvotes !== up || comment.downvotes !== down) {
                comment.upvotes = up;
                comment.downvotes = down;
                await comment.save();
                console.log(`Updated Comment: ${comment._id} (Up: ${up}, Down: ${down})`);
            }
        }

        console.log('Sync completed!');
        await mongoose.disconnect();
    } catch (err) {
        console.error(err);
    }
}

sync();
