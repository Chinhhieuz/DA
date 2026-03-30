const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Post = mongoose.model('Post', new mongoose.Schema({ community: String }, { collection: 'Posts' }));
        const Community = mongoose.model('Community', new mongoose.Schema({ name: String }, { collection: 'communities' }));
        
        const com = await Community.findOne({ name: 'Lập trình' });
        const post = await Post.findOne({ community: { $regex: /lập trình/i } });
        
        if (com) {
            console.log(`Community name: "${com.name}"`);
            console.log('Char codes:', com.name.split('').map(c => c.charCodeAt(0)));
        } else {
            console.log('Community "Lập trình" not found');
        }
        
        if (post) {
            console.log(`Post community: "${post.community}"`);
            console.log('Char codes:', post.community.split('').map(c => c.charCodeAt(0)));
        } else {
            console.log('Post with community "lập trình" not found');
        }
        
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
