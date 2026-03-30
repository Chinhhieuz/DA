const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Post = mongoose.model('Post', new mongoose.Schema({ community: String, title: String, status: String }, { collection: 'Posts' }));
        const Community = mongoose.model('Community', new mongoose.Schema({ name: String }, { collection: 'communities' }));
        
        const communities = await Community.find();
        const posts = await Post.find().limit(20);
        
        console.log('--- COMMUNITIES ---');
        communities.forEach(c => {
            console.log(`- "${c.name}" (Length: ${c.name.length})`);
        });
        
        console.log('\n--- POSTS (Sample) ---');
        posts.forEach(p => {
             console.log(`- Title: "${p.title}", Community: "${p.community}" (Length: ${p.community?.length}), Status: ${p.status}`);
        });

        // Test the regex match exactly as in controller
        console.log('\n--- TEST MATCHING ---');
        for(let com of communities) {
            const regex = new RegExp(`^${com.name}$`, 'i');
            const count = await Post.countDocuments({ community: { $regex: regex } });
            console.log(`Community "${com.name}" -> Found ${count} matches with regex ${regex}`);
        }

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
