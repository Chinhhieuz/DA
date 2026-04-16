const Account = require('../models/Account'); 

/**
 * Cập nhật thông tin profile
 */
const updateProfileService = async (accountId, updateData) => {
    const allowedFields = ['full_name', 'avatar_url', 'bio', 'location', 'website', 'mssv', 'faculty'];
    const allowedUpdates = {};
    
    allowedFields.forEach(field => {
        if (updateData[field] !== undefined) allowedUpdates[field] = updateData[field];
    });

    const updatedAccount = await Account.findByIdAndUpdate(
        accountId,
        { $set: allowedUpdates },
        { new: true } 
    );

    if (!updatedAccount) throw new Error('Tài khoản không tồn tại!');

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
 * Cập nhật cài đặt người dùng (Giao diện, Thông báo)
 */
const updateSettingsService = async (accountId, preferences) => {
    const updatedAccount = await Account.findByIdAndUpdate(
        accountId,
        { $set: { preferences } },
        { new: true }
    );
    if (!updatedAccount) throw new Error('Tài khoản không tồn tại!');
    return updatedAccount.preferences;
};

/**
 * Lấy thông tin Profile chi tiết theo ID (Bao gồm trạng thái Follow/Friend)
 */
const getProfileByIdService = async (userId, currentUserId) => {
    const account = await Account.findById(userId).select('-password_hash');
    if (!account) throw new Error('Người dùng không tồn tại!');
    
    let friendStatus = 'none';
    let isFollowing = false;

    if (currentUserId && currentUserId.toString() !== userId.toString()) {
        const currentUser = await Account.findById(currentUserId);
        if (currentUser) {
            // Logic cho Friend
            if (currentUser.friends.some(id => id.toString() === userId.toString())) {
                friendStatus = 'friends';
            } else if (currentUser.friendRequests.sent.some(id => id.toString() === userId.toString())) {
                friendStatus = 'sent';
            } else if (currentUser.friendRequests.received.some(id => id.toString() === userId.toString())) {
                friendStatus = 'received';
            }

            // Logic cho Follow
            if (currentUser.following.some(id => id.toString() === userId.toString())) {
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
 * Tìm kiếm người dùng theo tên hoặc username
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
            const followingList = (currentUser.following || []).map(id => id.toString());
            return users.map(user => ({
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
