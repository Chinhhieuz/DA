const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Thread = require('../models/Thread');
const authService = require('../services/authService');
const Account = require('../models/Account');
const socketModule = require('../socket');
const Notification = require('../models/Notification');

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ status: 'fail', message: 'Vui lòng nhập đầy đủ email và mật khẩu!' });
        }
        const result = await authService.loginUser(email, password);
        return res.status(200).json({
            status: 'success',
            message: 'Đăng nhập thành công!',
            data: { token: result.token, user: result.account, profile: result.profile }
        });
    } catch (error) {
        const statusCode = error.message.includes('không tồn tại') || error.message.includes('Sai') ? 401 : 500;
        return res.status(statusCode).json({ status: 'error', message: error.message || 'Lỗi máy chủ nội bộ!' });
    }
};

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ status: 'fail', message: 'Vui lòng cung cấp đủ tài khoản, email và mật khẩu!' });
        }
        const newUser = await authService.registerUser(req.body);
        return res.status(201).json({ status: 'success', message: 'Tạo tài khoản thành công!', data: newUser });
    } catch (error) {
        const statusCode = error.message.includes('đã tồn tại') ? 409 : 500;
        return res.status(statusCode).json({ status: 'error', message: error.message || 'Lỗi máy chủ nội bộ!' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const { accountId, ...updateData } = req.body;
        if (!accountId) return res.status(400).json({ status: 'fail', message: 'Thiếu định danh accountId' });
        const updatedProfile = await authService.updateProfileService(accountId, updateData);
        return res.status(200).json({ status: 'success', data: updatedProfile });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const { currentUserId } = req.query;
        const profile = await authService.getProfileByIdService(userId, currentUserId);
        return res.status(200).json({ status: 'success', data: profile });
    } catch (error) {
        return res.status(404).json({ status: 'fail', message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ status: 'fail', message: 'Vui lòng cung cấp email!' });
        const result = await authService.generateResetPasswordToken(email);
        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        console.error("FORGOT_PASSWORD_ERROR:", error);
        const statusCode = error.message.includes('không tồn tại') ? 404 : 500;
        return res.status(statusCode).json({ status: 'error', message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ status: 'fail', message: 'Thiếu token hoặc mật khẩu mới!' });
        const result = await authService.resetPassword(token, newPassword);
        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        const statusCode = error.message.includes('không hợp lệ') ? 400 : 500;
        return res.status(statusCode).json({ status: 'error', message: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { accountId, oldPassword, newPassword } = req.body;
        if (!accountId || !oldPassword || !newPassword) return res.status(400).json({ status: 'fail', message: 'Thiếu dữ liệu đổi mật khẩu' });
        const result = await authService.changePasswordAuth(accountId, oldPassword, newPassword);
        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { accountId, preferences } = req.body;
        if (!accountId || !preferences) return res.status(400).json({ status: 'fail', message: 'Thiếu dữ liệu' });
        const prefs = await authService.updateSettingsService(accountId, preferences);
        return res.status(200).json({ status: 'success', data: prefs });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const getUserStats = async (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) return res.status(400).json({ status: 'fail', message: 'Thiếu userId' });
        let authorQuery = userId;
        try { if (mongoose.Types.ObjectId.isValid(userId)) authorQuery = new mongoose.Types.ObjectId(userId); } catch (e) { }

        const [postCount, postLikes, commentLikes, threadLikes] = await Promise.all([
            Post.countDocuments({ author: authorQuery }),
            Post.aggregate([{ $match: { author: authorQuery } }, { $group: { _id: null, total: { $sum: "$upvotes" } } }]),
            Comment.aggregate([{ $match: { author: authorQuery } }, { $group: { _id: null, total: { $sum: "$upvotes" } } }]),
            Thread.aggregate([{ $match: { author: authorQuery } }, { $group: { _id: null, total: { $sum: "$upvotes" } } }])
        ]);

        const totalLikes = (postLikes[0]?.total || 0) + (commentLikes[0]?.total || 0) + (threadLikes[0]?.total || 0);
        return res.status(200).json({ status: 'success', data: { posts: postCount, totalLikes } });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const sendFriendRequest = async (req, res) => {
    try {
        const { senderId, targetId } = req.body;
        const result = await authService.sendFriendRequestService(senderId, targetId);

        // Gửi Socket Notification
        try {
            const senderAcc = await Account.findById(senderId);
            const io = socketModule.getIO();
            const connectedUsers = socketModule.getConnectedUsers();
            const recipientSocketId = connectedUsers.get(targetId);

            if (recipientSocketId && senderAcc) {
                io.to(recipientSocketId).emit('new_notification', {
                    type: 'friend_request',
                    senderName: senderAcc.display_name || senderAcc.username,
                    senderId: senderId
                });
            }
        } catch (e) { console.error('Socket error (send):', e.message); }

        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const acceptFriendRequest = async (req, res) => {
    try {
        const { userId, senderId } = req.body;
        const result = await authService.acceptFriendRequestService(userId, senderId);

        // Gửi Socket Notification cho người gửi lời mời
        try {
            const userAcc = await Account.findById(userId);
            const io = socketModule.getIO();
            const connectedUsers = socketModule.getConnectedUsers();
            const recipientSocketId = connectedUsers.get(senderId);

            if (recipientSocketId && userAcc) {
                io.to(recipientSocketId).emit('new_notification', {
                    type: 'like', // Dùng type like để hiện thông báo thường
                    senderName: userAcc.display_name || userAcc.username,
                    content: 'đã chấp nhận lời mời kết bạn của bạn'
                });
            }

            // Xóa thông báo friend_request cũ của người nhận
            await Notification.deleteOne({ recipient: userId, sender: senderId, type: 'friend_request' });

        } catch (e) { console.error('Socket error (accept):', e.message); }

        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const cancelFriendRequest = async (req, res) => {
    try {
        const { senderId, targetId } = req.body;
        const result = await authService.cancelFriendRequestService(senderId, targetId);

        // Gửi Socket Notification Hủy
        try {
            const io = socketModule.getIO();
            const connectedUsers = socketModule.getConnectedUsers();
            const recipientSocketId = connectedUsers.get(targetId);
            if (recipientSocketId) {
                io.to(recipientSocketId).emit('notification_cancelled', {
                    senderId: senderId,
                    type: 'friend_request'
                });
            }
        } catch (e) { console.error('Socket error (cancel):', e.message); }

        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const rejectFriendRequest = async (req, res) => {
    try {
        const { userId, senderId } = req.body;
        const result = await authService.rejectFriendRequestService(userId, senderId);

        // Xóa thông báo friend_request
        try {
            await Notification.deleteOne({ recipient: userId, sender: senderId, type: 'friend_request' });
        } catch (e) { }

        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const removeFriend = async (req, res) => {
    try {
        const { userId, targetId } = req.body;
        const result = await authService.removeFriendService(userId, targetId);
        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const followUser = async (req, res) => {
    try {
        const { followerId, targetId } = req.body;
        const result = await authService.followUserService(followerId, targetId);

        // Gửi Socket Notification cho người được follow
        try {
            const followerAcc = await Account.findById(followerId);
            const io = socketModule.getIO();
            const connectedUsers = socketModule.getConnectedUsers();
            const recipientSocketId = connectedUsers.get(targetId);

            if (recipientSocketId && followerAcc) {
                io.to(recipientSocketId).emit('new_notification', {
                    type: 'follow',
                    senderName: followerAcc.display_name || followerAcc.username,
                    content: 'đã bắt đầu theo dõi bạn',
                    senderId: followerId
                });
            }
        } catch (e) { console.error('Socket error (follow):', e.message); }

        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const unfollowUser = async (req, res) => {
    try {
        const { followerId, targetId } = req.body;
        const result = await authService.unfollowUserService(followerId, targetId);
        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const getFollowers = async (req, res) => {
    try {
        const { userId } = req.params;
        const followers = await authService.getFollowersService(userId);
        return res.status(200).json({ status: 'success', data: followers });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const getFollowing = async (req, res) => {
    try {
        const { userId } = req.params;
        const following = await authService.getFollowingService(userId);
        return res.status(200).json({ status: 'success', data: following });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const getFriends = async (req, res) => {
    try {
        const { userId } = req.params;
        const friends = await authService.getFriendsService(userId);
        return res.status(200).json({ status: 'success', data: friends });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const getFriendRequests = async (req, res) => {
    try {
        const { userId } = req.params;
        const requests = await authService.getFriendRequestsService(userId);
        return res.status(200).json({ status: 'success', data: requests });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const searchUsers = async (req, res) => {
    try {
        const { q } = req.query;
        const users = await authService.searchUsersService(q);
        return res.status(200).json({ status: 'success', data: users });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = {
    login,
    register,
    updateProfile,
    getProfile,
    forgotPassword,
    resetPassword,
    changePassword,
    updateSettings,
    getUserStats,
    sendFriendRequest,
    acceptFriendRequest,
    rejectFriendRequest,
    removeFriend,
    getFriends,
    getFriendRequests,
    followUser,
    unfollowUser,
    getFollowers,
    getFollowing,
    cancelFriendRequest,
    searchUsers
};