const mongoose = require('mongoose');
require('dotenv').config();

async function check() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const Community = mongoose.model('Community', new mongoose.Schema({ name: String }, { collection: 'communities' }));
        const communities = await Community.find().select('name');
        console.log('Community names in DB:', communities.map(c => c.name));
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

check();
