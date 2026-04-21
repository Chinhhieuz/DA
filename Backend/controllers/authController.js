const mongoose = require('mongoose');
const { getFromCache, setInCache } = require('../utils/memoryCache');
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
            return res.status(400).json({ status: 'fail', message: 'Vui long nhap day du email va mat khau!' });
        }
        const result = await authService.loginUser(email, password);
        return res.status(200).json({
            status: 'success',
            message: 'Dang nhap thanh cong!',
            data: { token: result.token, user: result.account, profile: result.profile }
        });
    } catch (error) {
        const lowerMessage = String(error.message || '').toLowerCase();
        const statusCode = (lowerMessage.includes('khong ton tai') || lowerMessage.includes('sai'))
            ? 401
            : 500;
        return res.status(statusCode).json({ status: 'error', message: error.message || 'Loi may chu noi bo!' });
    }
};

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password) {
            return res.status(400).json({ status: 'fail', message: 'Vui long cung cap du tai khoan, email va mat khau!' });
        }
        const newUser = await authService.registerUser(req.body);
        return res.status(201).json({ status: 'success', message: 'Tao tai khoan thanh cong!', data: newUser });
    } catch (error) {
        const lowerMessage = String(error.message || '').toLowerCase();
        const statusCode = lowerMessage.includes('da ton tai') ? 409 : 500;
        return res.status(statusCode).json({ status: 'error', message: error.message || 'Loi may chu noi bo!' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const updateData = req.body || {};
        // Moi cap nhat profile deu phai dua tren token hien tai.
        const authUserId = req.user?._id ? String(req.user._id) : '';
        if (!authUserId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const updatedProfile = await authService.updateProfileService(authUserId, updateData);
        return res.status(200).json({ status: 'success', data: updatedProfile });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const getProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        // Uu tien currentUserId tu token de xac dinh friend/follow status chinh xac.
        const currentUserId = req.user?._id
            ? String(req.user._id)
            : String(req.query?.currentUserId || '').trim();
        const profile = await authService.getProfileByIdService(userId, currentUserId);
        return res.status(200).json({ status: 'success', data: profile });
    } catch (error) {
        return res.status(404).json({ status: 'fail', message: error.message });
    }
};

const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ status: 'fail', message: 'Vui long cung cap email!' });
        const result = await authService.generateResetPasswordToken(email);
        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        console.error('FORGOT_PASSWORD_ERROR:', error);
        const lowerMessage = String(error.message || '').toLowerCase();
        const statusCode = lowerMessage.includes('khong ton tai') ? 404 : 500;
        return res.status(statusCode).json({ status: 'error', message: error.message });
    }
};

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) return res.status(400).json({ status: 'fail', message: 'Thieu token hoac mat khau moi!' });
        const result = await authService.resetPassword(token, newPassword);
        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        const lowerMessage = String(error.message || '').toLowerCase();
        const statusCode = lowerMessage.includes('khong hop le') ? 400 : 500;
        return res.status(statusCode).json({ status: 'error', message: error.message });
    }
};

const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const authUserId = req.user?._id ? String(req.user._id) : '';
        if (!authUserId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }
        if (!oldPassword || !newPassword) {
            return res.status(400).json({ status: 'fail', message: 'Thieu du lieu doi mat khau' });
        }

        const result = await authService.changePasswordAuth(authUserId, oldPassword, newPassword);
        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

const updateSettings = async (req, res) => {
    try {
        const { preferences } = req.body;
        const authUserId = req.user?._id ? String(req.user._id) : '';
        if (!authUserId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }
        if (!preferences) {
            return res.status(400).json({ status: 'fail', message: 'Thieu du lieu' });
        }

        const prefs = await authService.updateSettingsService(authUserId, preferences);
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

        const postCount = await Post.countDocuments({ author: authorQuery, status: 'approved' });
        const account = await Account.findById(userId).select('total_upvotes');
        const totalLikes = account?.total_upvotes || 0;

        return res.status(200).json({ status: 'success', data: { posts: postCount, totalLikes } });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const sendFriendRequest = async (req, res) => {
    try {
        // senderId luon lay tu token, client chi can gui targetId.
        const senderId = req.user?._id ? String(req.user._id) : '';
        const { targetId } = req.body;
        if (!senderId || !targetId) {
            return res.status(400).json({ status: 'fail', message: 'Thieu du lieu loi moi ket ban' });
        }
        const result = await authService.sendFriendRequestService(senderId, targetId);

        // Gửi Socket Notification
        try {
            const senderAcc = await Account.findById(senderId);
            const io = socketModule.getIO();
            if (senderAcc) {
                const rIdStr = targetId.toString();
                io.to(rIdStr).emit('new_notification', {
                    type: 'friend_request',
                    senderName: senderAcc.full_name || senderAcc.username,
                    senderId: senderId
                });
                console.log(`Y" [FRIEND_REQ] Gửi t>i Room: ${rIdStr}`);
            }
        } catch (e) { console.error('Socket error (send):', e.message); }

        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const acceptFriendRequest = async (req, res) => {
    try {
        // userId nguoi xu ly loi moi duoc xac dinh boi token.
        const userId = req.user?._id ? String(req.user._id) : '';
        const { senderId } = req.body;
        if (!userId || !senderId) {
            return res.status(400).json({ status: 'fail', message: 'Thieu du lieu chap nhan loi moi' });
        }
        const result = await authService.acceptFriendRequestService(userId, senderId);

        // Gửi Socket Notification cho người gửi lời mời
        try {
            const userAcc = await Account.findById(userId);
            const io = socketModule.getIO();
            if (userAcc) {
                const rIdStr = senderId.toString();
                io.to(rIdStr).emit('new_notification', {
                    type: 'like', // Dùng type like f hi?n thông báo thường
                    senderName: userAcc.full_name || userAcc.username,
                    content: 'ã chấp nhận lời mời kết bạn của bạn'
                });
                console.log(`Y" [FRIEND_ACCEPT] Gửi t>i Room: ${rIdStr}`);
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
        // senderId lay tu token de dam bao dung chu the huy loi moi.
        const senderId = req.user?._id ? String(req.user._id) : '';
        const { targetId } = req.body;
        if (!senderId || !targetId) {
            return res.status(400).json({ status: 'fail', message: 'Thieu du lieu huy loi moi' });
        }
        const result = await authService.cancelFriendRequestService(senderId, targetId);

        // Gửi Socket Notification Hủy
        try {
            const io = socketModule.getIO();
            const rIdStr = targetId.toString();
            io.to(rIdStr).emit('notification_cancelled', {
                senderId: senderId,
                type: 'friend_request'
            });
            console.log(`Y" [FRIEND_CANCEL] Gửi t>i Room: ${rIdStr}`);
        } catch (e) { console.error('Socket error (cancel):', e.message); }

        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const rejectFriendRequest = async (req, res) => {
    try {
        // userId lay tu token, senderId la nguoi da gui loi moi.
        const userId = req.user?._id ? String(req.user._id) : '';
        const { senderId } = req.body;
        if (!userId || !senderId) {
            return res.status(400).json({ status: 'fail', message: 'Thieu du lieu tu choi loi moi' });
        }
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
        // userId lay tu token de khong can truyen userId trong body.
        const userId = req.user?._id ? String(req.user._id) : '';
        const { targetId } = req.body;
        if (!userId || !targetId) {
            return res.status(400).json({ status: 'fail', message: 'Thieu du lieu huy ket ban' });
        }
        const result = await authService.removeFriendService(userId, targetId);
        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const followUser = async (req, res) => {
    try {
        // followerId lay tu token, chi can targetId tu client.
        const followerId = req.user?._id ? String(req.user._id) : '';
        const { targetId } = req.body;
        if (!followerId || !targetId) {
            return res.status(400).json({ status: 'fail', message: 'Thieu du lieu follow' });
        }
        const result = await authService.followUserService(followerId, targetId);

        // Gửi Socket Notification cho người ược follow
        try {
            const followerAcc = await Account.findById(followerId);
            const io = socketModule.getIO();
            if (followerAcc) {
                const rIdStr = targetId.toString();
                io.to(rIdStr).emit('new_notification', {
                    type: 'follow',
                    senderName: followerAcc.full_name || followerAcc.username,
                    content: 'ã bắt ầu theo dõi bạn',
                    senderId: followerId
                });
                console.log(`Y" [FOLLOW] Gửi t>i Room: ${rIdStr}`);
            }
        } catch (e) { console.error('Socket error (follow):', e.message); }

        return res.status(200).json({ status: 'success', message: result.message });
    } catch (error) {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
};

const unfollowUser = async (req, res) => {
    try {
        // followerId lay tu token, chi can targetId tu client.
        const followerId = req.user?._id ? String(req.user._id) : '';
        const { targetId } = req.body;
        if (!followerId || !targetId) {
            return res.status(400).json({ status: 'fail', message: 'Thieu du lieu unfollow' });
        }
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
        // currentUserId duoc lay tu token de tra ve isFollowing dung theo nguoi dang nhap.
        const currentUserId = req.user?._id
            ? String(req.user._id)
            : String(req.query?.currentUserId || '').trim();
        const cacheKey = `searchUsers_${q}_${currentUserId}`;
        let users = getFromCache(cacheKey);

        if (!users) {
            users = await authService.searchUsersService(q, currentUserId);
            setInCache(cacheKey, JSON.parse(JSON.stringify(users)), 120); // 2 minutes TTL
        }

        return res.status(200).json({ status: 'success', data: users });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};


const getLatestCommentsByPostIds = async (postIds = []) => {
    const sanitizedPostIds = postIds.filter(Boolean);
    const latestCommentsByPostId = new Map();

    if (!sanitizedPostIds.length) return latestCommentsByPostId;

    const latestCommentRows = await Comment.aggregate([
        { $match: { post: { $in: sanitizedPostIds } } },
        { $sort: { created_at: -1, _id: -1 } },
        { $group: { _id: '$post', latestCommentId: { $first: '$_id' } } }
    ]);

    const latestCommentIds = latestCommentRows
        .map((row) => row?.latestCommentId)
        .filter(Boolean);

    if (!latestCommentIds.length) return latestCommentsByPostId;

    const latestComments = await Comment.find({ _id: { $in: latestCommentIds } })
        .select('content author')
        .populate('author', 'username full_name')
        .lean();

    const commentById = new Map(
        latestComments.map((comment) => [String(comment._id), comment])
    );

    latestCommentRows.forEach((row) => {
        const postId = row?._id ? String(row._id) : '';
        const commentId = row?.latestCommentId ? String(row.latestCommentId) : '';
        if (!postId || !commentId) return;

        const latestComment = commentById.get(commentId);
        if (latestComment) latestCommentsByPostId.set(postId, [latestComment]);
    });

    return latestCommentsByPostId;
};

const getAggregatedProfile = async (req, res) => {
    try {
        const { userId } = req.params;
        const currentUserId = req.user?._id
            ? String(req.user._id)
            : String(req.query?.currentUserId || '').trim();

        const cacheKey = `aggregatedProfile_${userId}_${currentUserId}`;
        let profileData = getFromCache(cacheKey);
        if (profileData) {
            return res.status(200).json({ status: 'success', data: profileData });
        }

        const profile = await authService.getProfileByIdService(userId, currentUserId);
        const resolvedUserId = String(profile?._id || userId || '').trim();
        const normalizedCurrentUserId = String(currentUserId || '').trim();
        const isOwnProfile = !!resolvedUserId && resolvedUserId === normalizedCurrentUserId;
        if (!resolvedUserId) {
            return res.status(404).json({ status: 'fail', message: 'Nguoi dung khong ton tai' });
        }

        let authorQuery = resolvedUserId;
        try {
            if (mongoose.Types.ObjectId.isValid(resolvedUserId)) {
                authorQuery = new mongoose.Types.ObjectId(resolvedUserId);
            }
        } catch (e) { }

        const postStatusFilter = { status: 'approved' };
        const postFilter = { author: authorQuery, ...postStatusFilter };

        const [
            comments,
            postCount,
            followers,
            following,
            rawUserPosts,
            currentUserAcc
        ] = await Promise.all([
            Comment.find({ author: authorQuery })
                .populate('post', 'title community')
                .sort({ created_at: -1 })
                .lean(),
            Post.countDocuments(postFilter),
            authService.getFollowersService(resolvedUserId),
            authService.getFollowingService(resolvedUserId),
            Post.find(postFilter)
                .select('author community created_at title content image_url image_urls video_url upvotes downvotes status reactions comment_count')
                .populate('author', 'username email role avatar_url full_name')
                .sort({ created_at: -1, _id: -1 })
                .lean(),
            (currentUserId && mongoose.Types.ObjectId.isValid(currentUserId))
                ? Account.findById(currentUserId).select('following').lean()
                : Promise.resolve(null)
        ]);

        const totalLikes = profile?.total_upvotes || 0;
        let friendRequests = [];
        let savedPosts = [];
        const { formatPostData } = require('../utils/postFormatter');

        const followingListForPosts = currentUserAcc
            ? (currentUserAcc.following || []).map((id) => id.toString())
            : [];

        const userRecentCommentsByPostId = await getLatestCommentsByPostIds(
            rawUserPosts.map((post) => post._id)
        );

        const userPosts = rawUserPosts.map((post) => {
            const postId = String(post._id);
            const pCommentCount = post.comment_count;
            const pRecentComments = userRecentCommentsByPostId.get(postId) || [];

            let pUserVote = null;
            if (currentUserId && post.reactions) {
                const reaction = post.reactions.find((r) => r.user_id && r.user_id.toString() === currentUserId);
                if (reaction) pUserVote = reaction.type;
            }

            const pAuthorId = post.author ? (post.author._id || post.author).toString() : null;
            const pIsFollowing = pAuthorId ? followingListForPosts.includes(pAuthorId) : false;

            return formatPostData(post, pCommentCount, pRecentComments, pUserVote, pIsFollowing);
        });

        if (isOwnProfile) {
            const [friendRequestsResult, user] = await Promise.all([
                authService.getFriendRequestsService(resolvedUserId),
                Account.findById(resolvedUserId)
                    .select('savedPosts following')
                    .populate({
                        path: 'savedPosts',
                        select: 'author community created_at title content image_url image_urls video_url upvotes downvotes status reactions comment_count',
                        populate: { path: 'author', select: 'username full_name avatar_url' }
                    })
                    .lean()
            ]);

            friendRequests = friendRequestsResult;

            if (user && Array.isArray(user.savedPosts)) {
                const validPosts = user.savedPosts.filter(Boolean);
                const followingList = (user.following || []).map((id) => id.toString());
                const savedRecentCommentsByPostId = await getLatestCommentsByPostIds(
                    validPosts.map((post) => post._id)
                );

                savedPosts = validPosts.map((post) => {
                    const postObj = post && typeof post.toObject === 'function' ? post.toObject() : post;
                    const postId = String(postObj._id);
                    const commentCount = postObj.comment_count;
                    const recentComments = savedRecentCommentsByPostId.get(postId) || [];

                    let userVote = null;
                    if (postObj.reactions) {
                        const reaction = postObj.reactions.find((r) => r.user_id && r.user_id.toString() === resolvedUserId);
                        if (reaction) userVote = reaction.type;
                    }

                    const authorId = postObj.author ? (postObj.author._id || postObj.author).toString() : null;
                    const isFollowing = authorId ? followingList.includes(authorId) : false;

                    return formatPostData(postObj, commentCount, recentComments, userVote, isFollowing);
                });
            }
        }

        profileData = {
            profile,
            comments,
            stats: { posts: postCount, totalLikes },
            followers,
            following,
            friendRequests,
            savedPosts,
            userPosts
        };

        setInCache(cacheKey, JSON.parse(JSON.stringify(profileData)), 60); // 1 minute TTL

        return res.status(200).json({
            status: 'success',
            data: profileData
        });
    } catch (error) {
        console.error('[AUTH CONTROLLER] Ys L-i getAggregatedProfile:', error);
        return res.status(500).json({ status: 'error', message: `L-i máy chủ: ${error.message}` });
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
    searchUsers,
    getAggregatedProfile
};

