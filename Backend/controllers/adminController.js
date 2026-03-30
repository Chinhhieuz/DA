const Report = require('../models/Report');
const Post = require('../models/Post');
const Account = require('../models/Account');
const Community = require('../models/Community');

const getStats = async (req, res) => {
    console.log('[ADMIN CONTROLLER] 📊 Nhận yêu cầu lấy thống kê...');
    console.log('[ADMIN CONTROLLER] 🔍 Admin ID từ query:', req.query.admin_id);

    try {
        const Feedback = require('../models/Feedback');
        const [pendingReports, pendingPosts, totalUsers, communityCount, newFeedbacks] = await Promise.all([
            Report.countDocuments({ status: 'pending' }),
            Post.countDocuments({ status: 'pending' }),
            Account.countDocuments({}),
            Community.countDocuments({}),
            Feedback.countDocuments({ status: 'new' })
        ]);

        console.log('[ADMIN CONTROLLER] ✅ Kết quả thống kê:', {
            pendingReports,
            pendingPosts,
            totalUsers,
            communityCount,
            newFeedbacks
        });

        return res.status(200).json({
            status: 'success',
            data: {
                pendingReports,
                pendingPosts,
                totalUsers,
                communityCount,
                newFeedbacks
            }
        });
    } catch (error) {
        console.error('[ADMIN CONTROLLER] Lỗi lấy thống kê:', error.message);
        return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ khi lấy thống kê' });
    }
};

const unlockAccount = async (req, res) => {
    try {
        const { admin_id, user_id } = req.body;
        const adminUser = await Account.findById(admin_id);
        if (!adminUser || adminUser.role.toLowerCase() !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Không có quyền Admin!' });
        }

        const user = await Account.findById(user_id);
        if (!user) return res.status(404).json({ status: 'fail', message: 'Người dùng không tồn tại!' });

        user.is_locked = false;
        user.lock_until = undefined;
        user.lock_reason = undefined;
        // user.warning_count = 0; // Tùy chọn: reset hoặc giữ nguyên cảnh cáo. Người dùng bảo "mở khóa hết khi người dùng" -> có thể reset.
        user.warning_count = 0;

        await user.save();

        return res.status(200).json({ status: 'success', message: 'Đã mở khóa tài khoản thành công!' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const getLockedAccounts = async (req, res) => {
    try {
        const { admin_id } = req.query;
        const adminUser = await Account.findById(admin_id);
        if (!adminUser || adminUser.role.toLowerCase() !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Không có quyền Admin!' });
        }

        const lockedUsers = await Account.find({ is_locked: true }).select('username email full_name warning_count lock_reason lock_until avatar_url');
        return res.status(200).json({ status: 'success', data: lockedUsers });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const getHiddenPosts = async (req, res) => {
    try {
        const { admin_id } = req.query;
        const adminUser = await Account.findById(admin_id);
        if (!adminUser || adminUser.role.toLowerCase() !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Không có quyền Admin!' });
        }

        const hiddenPosts = await Post.find({ status: 'hidden' })
            .populate('author', 'username email full_name avatar_url')
            .sort({ updated_at: -1 });

        return res.status(200).json({ status: 'success', data: hiddenPosts });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const restorePost = async (req, res) => {
    try {
        const { admin_id } = req.body;
        const { id } = req.params;
        const adminUser = await Account.findById(admin_id);
        if (!adminUser || adminUser.role.toLowerCase() !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Không có quyền Admin!' });
        }

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ status: 'fail', message: 'Bài viết không tồn tại!' });

        post.status = 'approved';
        await post.save();

        return res.status(200).json({ status: 'success', message: 'Đã khôi phục bài viết thành công!' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const getUsers = async (req, res) => {
    try {
        const { admin_id, search } = req.query;
        const adminUser = await Account.findById(admin_id);
        if (!adminUser || adminUser.role.toLowerCase() !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Không có quyền Admin!' });
        }

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
        return res.status(200).json({ status: 'success', data: users });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = { getStats, unlockAccount, getLockedAccounts, getHiddenPosts, restorePost, getUsers };
