/**
 * Aggregator Service cho Authentication
 * File này gom tất cả các sub-services lại để đảm bảo tính thương thích ngược
 */

const coreAuth = require('./coreAuthService');
const profile = require('./profileService');
const social = require('./socialService');

module.exports = {
    // 1. Core Authentication
    ...coreAuth,

    // 2. Profile & Settings
    ...profile,

    // 3. Social (Friends & Followers)
    ...social
};