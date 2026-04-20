const NodeCache = require('node-cache');

// Standard TTL 5 minutes (300 seconds), Check period 120 seconds
const memoryCache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

const getFromCache = (key) => {
    return memoryCache.get(key);
};

const setInCache = (key, data, ttl) => {
    if (ttl !== undefined) {
        memoryCache.set(key, data, ttl);
    } else {
        memoryCache.set(key, data);
    }
};

const clearCache = (key) => {
    memoryCache.del(key);
};

module.exports = {
    memoryCache,
    getFromCache,
    setInCache,
    clearCache
};
