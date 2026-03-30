const mongoose = require('mongoose');
const Post = require('./models/Post');

async function check() {
    const uri = 'mongodb://tochinhhieu12112002_db_user:BYfo4gbSC1rms9kS@ac-hzdljpm-shard-00-00.zwczdgy.mongodb.net:27017,ac-hzdljpm-shard-00-01.zwczdgy.mongodb.net:27017,ac-hzdljpm-shard-00-02.zwczdgy.mongodb.net:27017/User?ssl=true&authSource=admin&replicaSet=atlas-10dsop-shard-0&retryWrites=true&w=majority';
    await mongoose.connect(uri);
    const posts = await Post.find({ downvotes: { $gt: 0 } });
    console.log('Posts with downvotes:', JSON.stringify(posts, null, 2));
    
    const allPosts = await Post.find({ reactions: { $exists: true, $not: { $size: 0 } } });
    console.log('Posts with reactions:', JSON.stringify(allPosts.map(p => ({
        id: p._id,
        upvotes: p.upvotes,
        downvotes: p.downvotes,
        reactions: p.reactions
    })), null, 2));
    
    process.exit(0);
}

check().catch(console.error);
