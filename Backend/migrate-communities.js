const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Post = mongoose.model('Post', new mongoose.Schema({ community: String }, { collection: 'Posts' }));
        const Community = mongoose.model('Community', new mongoose.Schema({ name: String }, { collection: 'communities' }));
        
        const communities = await Community.find();
        console.log('Migrating posts for communities:', communities.map(c => c.name));
        
        for (let com of communities) {
            const regex = new RegExp(`^${com.name}$`, 'i');
            const result = await Post.updateMany(
                { community: { $regex: regex } },
                { $set: { community: com.name } }
            );
            console.log(`Updated ${result.modifiedCount} posts for community "${com.name}"`);
        }

        // Handle the "D/LAPTRINH" case specifically if needed
        const resultD = await Post.updateMany(
            { community: { $regex: /^[rdD]\/LAPTRINH$/i } },
            { $set: { community: 'Lập trình' } }
        );
        console.log(`Normalized ${resultD.modifiedCount} "D/LAPTRINH" posts to "Lập trình"`);
        
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

migrate();

