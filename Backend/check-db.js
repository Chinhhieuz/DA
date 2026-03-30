const mongoose = require('mongoose');
require('dotenv').config({ path: './Backend/.env' });

async function check() {
    await mongoose.connect(process.env.MONGODB_URI);
    const Post = mongoose.model('Post', new mongoose.Schema({ author: mongoose.Schema.Types.Mixed }, { collection: 'Posts' }));
    const Account = mongoose.model('Account', new mongoose.Schema({ username: String }, { collection: 'Account' }));
    
    const post = await Post.findOne();
    console.log('Post author:', post ? post.author : 'No post');
    console.log('Post author type:', post ? typeof post.author : 'N/A');
    
    const account = await Account.findOne();
    console.log('Account _id:', account ? account._id : 'No account');
    console.log('Account _id type:', account ? typeof account._id : 'N/A');
    
    process.exit();
}

check();
