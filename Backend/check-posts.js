const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Post = mongoose.model('Post', new mongoose.Schema({ community: String }, { collection: 'Posts' }));
        const communitiesFound = await Post.distinct('community');
        console.log('Unique communities in Posts:', communitiesFound);
        
        const firstPost = await Post.findOne();
        console.log('First post community sample:', firstPost ? firstPost.community : 'No post');
        
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
