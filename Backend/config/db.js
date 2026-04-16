const mongoose = require('mongoose');

const globalCache = global;

if (!globalCache.__mongooseCache) {
    globalCache.__mongooseCache = {
        conn: null,
        promise: null
    };
}

const cached = globalCache.__mongooseCache;

const connectToDatabase = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        const mongoUri = process.env.MONGODB_URI;
        if (!mongoUri) {
            throw new Error('MONGODB_URI is not configured');
        }

        cached.promise = mongoose.connect(mongoUri, {
            family: 4,
            maxPoolSize: 10,
            minPoolSize: 1,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

module.exports = { connectToDatabase };
