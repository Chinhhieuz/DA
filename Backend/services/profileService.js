const Account = require('../models/Account');
const mongoose = require('mongoose');

const toBooleanOrDefault = (value, fallback) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const lowered = value.trim().toLowerCase();
        if (lowered === 'true') return true;
        if (lowered === 'false') return false;
    }
    if (typeof value === 'number') {
        if (value === 1) return true;
        if (value === 0) return false;
    }
    return fallback;
};

/**
 * Cap nhat thong tin profile
 */
const updateProfileService = async (accountId, updateData) => {
    const allowedFields = ['full_name', 'avatar_url', 'bio', 'location', 'website', 'mssv', 'faculty'];
    const allowedUpdates = {};

    allowedFields.forEach((field) => {
        if (updateData[field] !== undefined) allowedUpdates[field] = updateData[field];
    });

    const updatedAccount = await Account.findByIdAndUpdate(
        accountId,
        { $set: allowedUpdates },
        { new: true }
    );

    if (!updatedAccount) throw new Error('Tai khoan khong ton tai!');

    return {
        id: updatedAccount._id,
        email: updatedAccount.email,
        username: updatedAccount.username,
        full_name: updatedAccount.full_name,
        display_name: updatedAccount.full_name || updatedAccount.username,
        name: updatedAccount.full_name || updatedAccount.username,
        avatar_url: updatedAccount.avatar_url,
        bio: updatedAccount.bio,
        location: updatedAccount.location,
        website: updatedAccount.website,
        mssv: updatedAccount.mssv,
        faculty: updatedAccount.faculty,
        role: updatedAccount.role
    };
};

/**
 * Cap nhat cai dat nguoi dung (Giao dien, thong bao)
 */
const updateSettingsService = async (accountId, preferences) => {
    const safePreferences = {
        darkMode: toBooleanOrDefault(preferences?.darkMode, false),
        pushNotifications: toBooleanOrDefault(preferences?.pushNotifications, true),
        commentNotifications: toBooleanOrDefault(preferences?.commentNotifications, true)
    };

    const updatedAccount = await Account.findByIdAndUpdate(
        accountId,
        { $set: { preferences: safePreferences } },
        { new: true }
    );

    if (!updatedAccount) throw new Error('Tai khoan khong ton tai!');
    return updatedAccount.preferences;
};

/**
 * Lay thong tin Profile chi tiet theo ID (bao gom trang thai Follow/Friend)
 */
const getProfileByIdService = async (userId, currentUserId) => {
    const normalizedInput = String(userId || '').trim();
    if (!normalizedInput) throw new Error('Nguoi dung khong ton tai!');

    // Ho tro ca 2 kieu truy cap profile:
    // 1) /profile/<objectId>
    // 2) /profile/<username>
    const accountQuery = mongoose.Types.ObjectId.isValid(normalizedInput)
        ? Account.findById(normalizedInput)
        : Account.findOne({ username: normalizedInput });

    const account = await accountQuery.select('-password_hash');
    if (!account) throw new Error('Nguoi dung khong ton tai!');

    const targetUserId = account._id.toString();

    let friendStatus = 'none';
    let isFollowing = false;

    // Neu dang xem profile nguoi khac thi tra ve trang thai ket noi/follow tu current user.
    if (currentUserId && currentUserId.toString() !== targetUserId) {
        const currentUser = await Account.findById(currentUserId);
        if (currentUser) {
            if (currentUser.friends.some((id) => id.toString() === targetUserId)) {
                friendStatus = 'friends';
            } else if (currentUser.friendRequests.sent.some((id) => id.toString() === targetUserId)) {
                friendStatus = 'sent';
            } else if (currentUser.friendRequests.received.some((id) => id.toString() === targetUserId)) {
                friendStatus = 'received';
            }

            if (currentUser.following.some((id) => id.toString() === targetUserId)) {
                isFollowing = true;
            }
        }
    }

    return {
        ...account.toObject(),
        friendStatus,
        isFollowing,
        followersCount: account.followers ? account.followers.length : 0,
        followingCount: account.following ? account.following.length : 0
    };
};

/**
 * Tim kiem nguoi dung theo ten hoac username
 */
const searchUsersService = async (query, currentUserId = null) => {
    if (!query) return [];

    const users = await Account.find({
        $or: [
            { username: { $regex: query, $options: 'i' } },
            { full_name: { $regex: query, $options: 'i' } }
        ]
    }).select('username full_name avatar_url bio').limit(20).lean();

    if (currentUserId) {
        const currentUser = await Account.findById(currentUserId).select('following');
        if (currentUser) {
            const followingList = (currentUser.following || []).map((id) => id.toString());
            return users.map((user) => ({
                ...user,
                isFollowing: followingList.includes(user._id.toString())
            }));
        }
    }

    return users;
};

module.exports = {
    updateProfileService,
    updateSettingsService,
    getProfileByIdService,
    searchUsersService
};
