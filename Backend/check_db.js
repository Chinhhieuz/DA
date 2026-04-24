const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/forum');
        const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false, collection: 'Posts' }));
        
        const counts = await Post.aggregate([
            {
                $group: {
                    _id: '$community',
                    totalCount: { $sum: 1 },
                    approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
                }
            }
        ]);
        
        console.log('Post counts by community raw field:');
        console.log(JSON.stringify(counts, null, 2));
        
        const aiPosts = await Post.find({ 
            community: { $regex: /Trí tuệ nhân tạo/i },
            status: 'approved'
        }).limit(5);
        
        console.log('\nSample Approved AI Posts community values:');
        aiPosts.forEach(p => console.log(`"${p.community}"`));
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
