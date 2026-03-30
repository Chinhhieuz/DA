const mongoose = require('mongoose');
require('dotenv').config({ path: 'd:/DA/DA/Backend/.env' });

const Post = require('./models/Post');
const Account = require('./models/Account');

const fs = require('fs');

async function check() {
    let output = '';
    const log = (msg) => { output += msg + '\n'; console.log(msg); };

    try {
        await mongoose.connect(process.env.MONGODB_URI);
        log('Connected to DB');

        const posts = await Post.find({ 'reactions.0': { $exists: true } }).limit(10);
        log(`Found ${posts.length} posts with reactions`);

        for (const post of posts) {
            log(`\nPost: ${post.title} (${post._id})`);
            log(`Upvotes field: ${post.upvotes}, Downvotes field: ${post.downvotes}`);
            log('Reactions array:');
            post.reactions.forEach(r => {
                log(` - User: ${r.user_id}, Type: ${r.type}`);
            });
        }

        const accounts = await Account.find({}).limit(5);
        log('\nSample Accounts:');
        accounts.forEach(a => {
            log(` - ${a.username}: ${a._id} (Name: ${a.display_name || a.full_name})`);
        });

        fs.writeFileSync('d:/DA/DA/Backend/debug_output.txt', output);
        await mongoose.disconnect();
    } catch (err) {
        log('Error: ' + err.message);
        fs.writeFileSync('d:/DA/DA/Backend/debug_output.txt', output);
    }
}

check();
