const bcrypt = require('bcryptjs');
const notificationService = require('./notificationService');
const mongoose = require('mongoose');
const Account = require('../models/Account');
const Post = require('../models/Post');
const Report = require('../models/Report');
const Community = require('../models/Community');
const Feedback = require('../models/Feedback');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const Thread = require('../models/Thread');
const Comment = require('../models/Comment');

const checkAdminRights = async (admin_id) => {
    const adminUser = await Account.findById(admin_id);
    if (!adminUser || adminUser.role.toLowerCase() !== 'admin') {
        throw new Error('FORBIDDEN:Không có quyền Admin!');
    }
};

const getStatsService = async (admin_id) => {
    if (admin_id) {
        console.log(`[ADMIN SERVICE] Fetching stats for Admin: ${admin_id}`);
    }
    
    console.log('[ADMIN SERVICE] Step 1: Querying counts...');
    const [pendingReports, pendingPosts, totalUsers, communityCount, newFeedbacks] = await Promise.all([
        Report.countDocuments({ status: 'pending' }),
        Post.countDocuments({ status: 'pending' }),
        Account.countDocuments({}),
        Community.countDocuments({}),
        Feedback.countDocuments({ status: 'new' })
    ]);
    console.log('[ADMIN SERVICE] Step 2: Counts received successfully.');

    return { pendingReports, pendingPosts, totalUsers, communityCount, newFeedbacks };
};

const unlockAccountService = async ({ admin_id, user_id }) => {
    await checkAdminRights(admin_id);

    const user = await Account.findById(user_id);
    if (!user) throw new Error('NOT_FOUND:Người dùng không tồn tại!');

    user.is_locked = false;
    user.lock_until = undefined;
    user.lock_reason = undefined;
    user.warning_count = 0;

    await user.save();
    return true;
};

const getLockedAccountsService = async (admin_id) => {
    await checkAdminRights(admin_id);
    const lockedUsers = await Account.find({ is_locked: true }).select('username email full_name warning_count lock_reason lock_until avatar_url');
    return lockedUsers;
};

const getHiddenPostsService = async (admin_id) => {
    await checkAdminRights(admin_id);
    const hiddenPosts = await Post.find({ status: 'hidden' })
        .populate('author', 'username email full_name avatar_url')
        .sort({ updated_at: -1 });
    return hiddenPosts;
};

const restorePostService = async ({ admin_id, id }) => {
    await checkAdminRights(admin_id);

    const post = await Post.findById(id);
    if (!post) throw new Error('NOT_FOUND:Bài viết không tồn tại!');

    post.status = 'approved';
    await post.save();
    return true;
};

const getUsersService = async ({ admin_id, search }) => {
    await checkAdminRights(admin_id);

    let query = {};
    if (search) {
        query = {
            $or: [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
                { full_name: { $regex: search, $options: 'i' } },
                { mssv: { $regex: search, $options: 'i' } }
            ]
        };
    }

    const users = await Account.find(query).select('-password_hash').sort({ created_at: -1 });
    return users;
};

const updateUserService = async ({ admin_id, id }, updateData) => {
    await checkAdminRights(admin_id);

    const user = await Account.findById(id);
    if (!user) throw new Error('NOT_FOUND:Người dùng không tồn tại!');

    const { username, email, full_name, mssv, role, password } = updateData;

    if (username) user.username = username;
    if (email) user.email = email;
    if (full_name !== undefined) user.full_name = full_name;
    if (mssv !== undefined) user.mssv = mssv;
    if (role) user.role = role;

    if (password) {
        const salt = await bcrypt.genSalt(10);
        user.password_hash = await bcrypt.hash(password, salt);
    }

    await user.save();
    return true;
};

const deleteUserService = async ({ admin_id, id }) => {
    await checkAdminRights(admin_id);

    const user = await Account.findById(id);
    if (!user) throw new Error('NOT_FOUND:Người dùng không tồn tại!');
    
    if (user.role && user.role.toLowerCase() === 'admin') {
        throw new Error('FORBIDDEN:Không thể xóa tài khoản Quản trị viên!');
    }

    // 1. Phân tích các bài viết của user để xóa thông báo liên quan
    const posts = await Post.find({ author: id });
    const postIds = posts.map(p => p._id);

    // 2. Phân tích các bình luận của user để xóa thông báo liên quan
    const comments = await Comment.find({ author: id });
    const commentIds = comments.map(c => c._id);

    // 3. Xử lý xóa dây chuyền toàn diện
    // Xóa Notifications liên quan đến các bài viết của user
    for (const pid of postIds) {
        await notificationService.deleteNotificationsByPost(pid);
    }
    // Xóa Notifications liên quan đến các bình luận của user
    for (const cid of commentIds) {
        await notificationService.deleteNotificationsByComment(cid);
    }
    // Xóa Notifications mà user là người gửi hoặc người nhận
    const Notification = require('../models/Notification');
    await Notification.deleteMany({ $or: [{ recipient: id }, { sender: id }] });

    // Xóa Tin nhắn và Hội thoại
    await Message.deleteMany({ $or: [{ sender: id }, { recipient: id }] });
    await Conversation.deleteMany({ participants: id });

    // Xóa Phản hồi (Threads)
    await Thread.deleteMany({ author: id });
    
    // Xóa Bình luận
    await Comment.deleteMany({ post: { $in: postIds } });
    await Comment.deleteMany({ author: id });

    // Xóa Báo cáo (Reports)
    await Report.deleteMany({ $or: [{ reporter: id }, { reported_item_id: id }, { reported_user: id }] });

    // Xóa Bài viết
    await Post.deleteMany({ author: id });

    // Cuối cùng xóa tài khoản
    await Account.findByIdAndDelete(id);

    return true;
};

module.exports = {
    getStatsService,
    unlockAccountService,
    getLockedAccountsService,
    getHiddenPostsService,
    restorePostService,
    getUsersService,
    updateUserService,
    deleteUserService
};
