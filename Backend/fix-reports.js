const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const result = await mongoose.connection.collection('Reports').updateMany(
            { status: { $exists: false } }, 
            { $set: { status: 'pending' } }
        );
        console.log(`Updated ${result.modifiedCount} reports with status: pending`);
        
        // Also check if any have empty string or null
        const result2 = await mongoose.connection.collection('Reports').updateMany(
            { status: { $in: [null, ''] } },
            { $set: { status: 'pending' } }
        );
        console.log(`Updated ${result2.modifiedCount} reports with null/empty status`);

        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

migrate();
