require('dotenv').config();
const mongoose = require('mongoose');

const Post = mongoose.model('Post', new mongoose.Schema({}, { collection: 'Posts', strict: false }));

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.');
    const post = await Post.findOne();
    if (post) {
        console.log('Author ID:', post.author);
        console.log('Author Type:', typeof post.author);
        console.log('Is ObjectId:', post.author instanceof mongoose.Types.ObjectId);
    } else {
        console.log('No posts found.');
    }
    process.exit();
}

run().catch(console.error);
