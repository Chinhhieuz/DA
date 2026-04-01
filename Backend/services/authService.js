const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const Account = require('../models/Account'); 
const User = require('../models/User'); 
const Notification = require('../models/Notification');

const loginUser = async (email, password) => {
    const account = await Account.findOne({ 
        $or: [
            { email: email },
            { username: email }
        ]
    });
    if (!account) {
        throw new Error('Tài khoản hoặc Email không tồn tại!');
    }

    let isMatch = false;
    if (password === account.password_hash) {
        isMatch = true; 
    } else {
        isMatch = await bcrypt.compare(password, account.password_hash);
    }
    
    if (!isMatch) {
        throw new Error('Sai mật khẩu!');
    }

    // Kiểm tra khóa tài khoản
    if (account.is_locked) {
        if (account.lock_until && account.lock_until < new Date()) {
            // Tự động mở khóa nếu hết hạn
            account.is_locked = false;
            account.lock_until = undefined;
            account.lock_reason = undefined;
            await account.save();
        } else {
            const reason = account.lock_reason || "Vi phạm quy tắc cộng đồng";
            const until = account.lock_until ? ` đến ${account.lock_until.toLocaleString('vi-VN')}` : " vĩnh viễn";
            throw new Error(`Tài khoản của bạn đang bị khóa${until}. Lý do: ${reason}. Vui lòng liên hệ Admin để khiếu nại.`);
        }
    }
    const token = jwt.sign(
        { accountId: account._id, role: account.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    let profile = null;
    if (account.role === 'user') {
        profile = await User.findOne({ account_id: account._id });
    }

    return {
        token,
        account: {
            id: account._id,
            email: account.email,
            username: account.username,
            full_name: account.full_name,
            avatar_url: account.avatar_url,
            bio: account.bio,
            location: account.location,
            website: account.website,
            role: account.role,
            preferences: account.preferences || { darkMode: false, pushNotifications: true, commentNotifications: true }
        },
        profile
    };
};

const registerUser = async (userData) => {
    const { username, email, password, role, full_name, mssv, avatar_url } = userData;

    const existingAccount = await Account.findOne({
        $or: [
            { email: email },
            { username: username }
        ]
    });
    if (existingAccount) {
        throw new Error('Tài khoản hoặc Email đã tồn tại!');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAccount = new Account({
        username,
        email,
        password_hash: hashedPassword,
        role: role || 'User',
        full_name: full_name || '',
        mssv: mssv || '',
        avatar_url: avatar_url || ''
    });

    await newAccount.save();
    
    return {
        id: newAccount._id,
        username: newAccount.username,
        email: newAccount.email,
        role: newAccount.role
    };
};

const updateProfileService = async (accountId, updateData) => {
    const allowedUpdates = {};
    if (updateData.full_name !== undefined) allowedUpdates.full_name = updateData.full_name;
    if (updateData.avatar_url !== undefined) allowedUpdates.avatar_url = updateData.avatar_url;
    if (updateData.bio !== undefined) allowedUpdates.bio = updateData.bio;
    if (updateData.location !== undefined) allowedUpdates.location = updateData.location;
    if (updateData.website !== undefined) allowedUpdates.website = updateData.website;
    if (updateData.mssv !== undefined) allowedUpdates.mssv = updateData.mssv;
    if (updateData.faculty !== undefined) allowedUpdates.faculty = updateData.faculty;

    const updatedAccount = await Account.findByIdAndUpdate(
        accountId,
        { $set: allowedUpdates },
        { new: true } 
    );

    if (!updatedAccount) {
        throw new Error('Tài khoản không tồn tại!');
    }

    return {
        id: updatedAccount._id,
        email: updatedAccount.email,
        username: updatedAccount.username,
        full_name: updatedAccount.full_name,
        avatar_url: updatedAccount.avatar_url,
        bio: updatedAccount.bio,
        location: updatedAccount.location,
        website: updatedAccount.website,
        role: updatedAccount.role
    };
};

const generateResetPasswordToken = async (email) => {
    const account = await Account.findOne({
        $or: [
            { email: email },
            { username: email }
        ]
    });
    if (!account) {
        throw new Error('Tài khoản hoặc Email không tồn tại trong hệ thống!');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    account.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    account.resetPasswordExpires = Date.now() + 3600000;

    await account.save();

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/?view=reset-password&token=${resetToken}`;

    try {
        const brevoApiKey = process.env.BREVO_API_KEY;
        const emailUser = process.env.EMAIL_USER;

        if (!brevoApiKey) {
            throw new Error('Thiếu BREVO_API_KEY trong file .env');
        }
        if (!emailUser) {
            throw new Error('Thiếu EMAIL_USER trong file .env (Email người gửi phải được xác thực trong Brevo)');
        }

        // Tự động kiểm tra fetch (Node 18+) hoặc báo lỗi nếu không có
        if (typeof fetch === 'undefined') {
            throw new Error('Môi trường Node.js hiện tại không hỗ trợ fetch. Vui lòng nâng cấp lên Node 18+ hoặc cài đặt node-fetch.');
        }

        console.log(`--- Đang gửi mail đặt lại mật khẩu đến: ${account.email} ---`);
        console.log(`Sender: ${emailUser}`);

        // Gửi qua HTTP API (Không lo bị chặn Port, tốc độ cực nhanh)
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                sender: { 
                    name: 'Hỗ trợ Kỹ thuật DA', 
                    email: emailUser 
                },
                to: [{ email: account.email }],
                subject: `Khôi phục mật khẩu - Hệ thống DA`,
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #dc2626; text-align: center;">Khôi phục mật khẩu</h2>
                        <p>Chào bạn,</p>
                        <p>Hệ thống đã ghi nhận một thông báo yêu cầu khôi phục mật khẩu từ bạn.</p>
                        <p>Vui lòng <strong>Nhấn vào nút bên dưới</strong> để đặt lại mật khẩu (Lưu ý: Liên kết chỉ tồn tại trong vòng 60 phút):</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đổi mật khẩu ngay</a>
                        </div>
                        <p>Nếu bạn gặp khó khăn, bạn có thể copy và dán đường link này vào trình duyệt:</p>
                        <p style="word-break: break-all; color: #0066cc;">${resetUrl}</p>
                        <hr style="border: 0; border-top: 1px solid #ccc; margin-top: 30px;">
                        <p style="font-size: 13px; color: #777;">Nếu bạn không yêu cầu điều này, xin hãy bỏ qua bức thư để giữ an toàn cho tài khoản.</p>
                    </div>
                `
            })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error('❌ Brevo API Error Detail:', JSON.stringify(data, null, 2));
            throw new Error(data.message || data.code || 'Lỗi không xác định từ Brevo API');
        }

        console.log(`✅ Mail đã gửi qua Brevo API thành công đến: ${account.email}`);
        return { message: 'Thành công! Kiểm tra hộp thư (hoặc thư rác) của bạn để lấy link đổi mật khẩu.' };
    } catch (error) {
        console.error('❌ Error sending email:', error.message);
        // Nhả lại token do không gửi được email
        account.resetPasswordToken = undefined;
        account.resetPasswordExpires = undefined;
        await account.save();
        throw new Error(`Dịch vụ gửi Mail báo lỗi: ${error.message}`);
    }
};

const resetPassword = async (token, newPassword) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const account = await Account.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!account) {
        throw new Error('Token đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.');
    }

    const salt = await bcrypt.genSalt(10);
    account.password_hash = await bcrypt.hash(newPassword, salt);
    account.resetPasswordToken = undefined;
    account.resetPasswordExpires = undefined;

    await account.save();

    return { message: 'Đổi mật khẩu thành công!' };
};

const changePasswordAuth = async (accountId, oldPassword, newPassword) => {
    const account = await Account.findById(accountId);
    if (!account) throw new Error('Tài khoản không tồn tại!');

    let isMatch = false;
    if (oldPassword === account.password_hash) {
        isMatch = true; 
    } else {
        isMatch = await bcrypt.compare(oldPassword, account.password_hash);
    }

    if (!isMatch) {
        throw new Error('Mật khẩu cũ không chính xác!');
    }

    const salt = await bcrypt.genSalt(10);
    account.password_hash = await bcrypt.hash(newPassword, salt);
    await account.save();

    return { message: 'Đổi mật khẩu thành công!' };
};

const updateSettingsService = async (accountId, preferences) => {
    const updatedAccount = await Account.findByIdAndUpdate(
        accountId,
        { $set: { preferences } },
        { new: true }
    );
    if (!updatedAccount) throw new Error('Tài khoản không tồn tại!');
    return updatedAccount.preferences;
};

const sendFriendRequestService = async (senderId, targetId) => {
    if (senderId === targetId) throw new Error('Bạn không thể kết bạn với chính mình!');

    const [sender, target] = await Promise.all([
        Account.findById(senderId),
        Account.findById(targetId)
    ]);

    if (!sender || !target) throw new Error('Người dùng không tồn tại!');
    
    if (sender.friends.some(id => id.toString() === targetId)) {
        throw new Error('Hai bạn đã là bạn bè!');
    }

    if (target.friendRequests.received.some(id => id.toString() === senderId)) {
        throw new Error('Bạn đã gửi yêu cầu kết bạn cho người này rồi!');
    }

    if (sender.friendRequests.received.some(id => id.toString() === targetId)) {
        return await acceptFriendRequestService(senderId, targetId);
    }

    target.friendRequests.received.push(senderId);
    sender.friendRequests.sent.push(targetId);

    // Tạo thông báo kết bạn
    const notif = new Notification({
        recipient: targetId,
        sender: senderId,
        type: 'friend_request'
    });

    await Promise.all([target.save(), sender.save(), notif.save()]);
    return { message: 'Đã gửi yêu cầu kết bạn!' };
};

const acceptFriendRequestService = async (userId, senderId) => {
    const [user, sender] = await Promise.all([
        Account.findById(userId),
        Account.findById(senderId)
    ]);

    if (!user || !sender) throw new Error('Người dùng không tồn tại!');

    user.friendRequests.received = user.friendRequests.received.filter(id => id.toString() !== senderId);
    sender.friendRequests.sent = sender.friendRequests.sent.filter(id => id.toString() !== userId);

    if (!user.friends.some(id => id.toString() === senderId)) user.friends.push(senderId);
    if (!sender.friends.some(id => id.toString() === userId)) sender.friends.push(userId);

    await Promise.all([user.save(), sender.save()]);
    return { message: 'Đã chấp nhận lời mời kết bạn!' };
};

const rejectFriendRequestService = async (userId, senderId) => {
    const [user, sender] = await Promise.all([
        Account.findById(userId),
        Account.findById(senderId)
    ]);

    if (user) {
        user.friendRequests.received = user.friendRequests.received.filter(id => id.toString() !== senderId);
        await user.save();
    }
    if (sender) {
        sender.friendRequests.sent = sender.friendRequests.sent.filter(id => id.toString() !== userId);
        await sender.save();
    }

    return { message: 'Đã từ chối lời mời kết bạn!' };
};

const cancelFriendRequestService = async (senderId, targetId) => {
    const [sender, target] = await Promise.all([
        Account.findById(senderId),
        Account.findById(targetId)
    ]);

    if (sender) {
        sender.friendRequests.sent = sender.friendRequests.sent.filter(id => id.toString() !== targetId);
        await sender.save();
    }
    if (target) {
        target.friendRequests.received = target.friendRequests.received.filter(id => id.toString() !== senderId);
        await target.save();
    }

    // Xóa thông báo đã gửi
    await Notification.deleteOne({ recipient: targetId, sender: senderId, type: 'friend_request' });

    return { message: 'Đã hủy yêu cầu kết bạn!' };
};

const removeFriendService = async (userId, targetId) => {
    const [user, target] = await Promise.all([
        Account.findById(userId),
        Account.findById(targetId)
    ]);

    if (user) {
        user.friends = user.friends.filter(id => id.toString() !== targetId);
        await user.save();
    }
    if (target) {
        target.friends = target.friends.filter(id => id.toString() !== userId);
        await target.save();
    }

    return { message: 'Đã hủy kết bạn!' };
};

const followUserService = async (followerId, targetId) => {
    if (followerId === targetId) throw new Error('Bạn không thể theo dõi chính mình!');

    const [follower, target] = await Promise.all([
        Account.findById(followerId),
        Account.findById(targetId)
    ]);

    if (!follower || !target) throw new Error('Người dùng không tồn tại!');

    // Thêm vào danh sách following của người đi follow
    if (!follower.following.some(id => id.toString() === targetId)) {
        follower.following.push(targetId);
    }
    // Thêm vào danh sách followers của người được follow
    if (!target.followers.some(id => id.toString() === followerId)) {
        target.followers.push(followerId);
    }

    // Gửi thông báo follow (dùng type follow)
    const notif = new Notification({
        recipient: targetId,
        sender: followerId,
        type: 'follow',
        content: 'đã bắt đầu theo dõi bạn'
    });

    await Promise.all([follower.save(), target.save(), notif.save()]);
    return { message: 'Đã theo dõi người dùng này!' };
};

const unfollowUserService = async (followerId, targetId) => {
    const [follower, target] = await Promise.all([
        Account.findById(followerId),
        Account.findById(targetId)
    ]);

    if (follower) {
        follower.following = follower.following.filter(id => id.toString() !== targetId);
        await follower.save();
    }
    if (target) {
        target.followers = target.followers.filter(id => id.toString() !== followerId);
        await target.save();
    }

    return { message: 'Đã bỏ theo dõi!' };
};

const getFollowersService = async (userId) => {
    const user = await Account.findById(userId).populate('followers', 'full_name username avatar_url bio');
    if (!user) throw new Error('Người dùng không tồn tại!');
    return user.followers;
};

const getFollowingService = async (userId) => {
    const user = await Account.findById(userId).populate('following', 'full_name username avatar_url bio');
    if (!user) throw new Error('Người dùng không tồn tại!');
    return user.following;
};

const getFriendsService = async (userId) => {
    const user = await Account.findById(userId).populate('friends', 'full_name username avatar_url bio');
    if (!user) throw new Error('Người dùng không tồn tại!');
    return user.friends;
};

const getFriendRequestsService = async (userId) => {
    const user = await Account.findById(userId).populate('friendRequests.received', 'full_name username avatar_url');
    if (!user) throw new Error('Người dùng không tồn tại!');
    return user.friendRequests.received;
};

const getProfileByIdService = async (userId, currentUserId) => {
    const account = await Account.findById(userId).select('-password_hash');
    if (!account) throw new Error('Người dùng không tồn tại!');
    
    let friendStatus = 'none';
    let isFollowing = false;

    if (currentUserId && currentUserId !== userId) {
        const currentUser = await Account.findById(currentUserId);
        if (currentUser) {
            // Logic cho Friend (Legacy)
            if (currentUser.friends.some(id => id.toString() === userId)) {
                friendStatus = 'friends';
            } else if (currentUser.friendRequests.sent.some(id => id.toString() === userId)) {
                friendStatus = 'sent';
            } else if (currentUser.friendRequests.received.some(id => id.toString() === userId)) {
                friendStatus = 'received';
            }

            // Logic cho Follow
            if (currentUser.following.some(id => id.toString() === userId)) {
                isFollowing = true;
            }
        }
    }

    const followersCount = account.followers ? account.followers.length : 0;
    const followingCount = account.following ? account.following.length : 0;

    return { 
        ...account.toObject(), 
        friendStatus, 
        isFollowing,
        followersCount,
        followingCount
    };
};

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
    loginUser,
    registerUser,
    updateProfileService,
    generateResetPasswordToken,
    resetPassword,
    changePasswordAuth,
    updateSettingsService,
    sendFriendRequestService,
    cancelFriendRequestService,
    acceptFriendRequestService,
    rejectFriendRequestService,
    removeFriendService,
    getFriendsService,
    getFriendRequestsService,
    getFollowersService,
    getFollowingService,
    followUserService,
    unfollowUserService,
    getProfileByIdService,
    searchUsersService
};