const Account = require('../models/Account'); 
const Notification = require('../models/Notification');
const notificationService = require('./notificationService');

/**
 * Gửi yêu cầu kết bạn
 */
const sendFriendRequestService = async (senderId, targetId) => {
    if (senderId.toString() === targetId.toString()) throw new Error('Bạn không thể kết bạn với chính mình!');

    const [sender, target] = await Promise.all([
        Account.findById(senderId),
        Account.findById(targetId)
    ]);

    if (!sender || !target) throw new Error('Người dùng không tồn tại!');
    if (sender.friends.some(id => id.toString() === targetId.toString())) throw new Error('Hai bạn đã là bạn bè!');
    if (target.friendRequests.received.some(id => id.toString() === senderId.toString())) throw new Error('Bạn đã gửi yêu cầu rồi!');

    // Nếu người kia cũng gửi cho mình -> Tự động đồng ý
    if (sender.friendRequests.received.some(id => id.toString() === targetId.toString())) {
        return await acceptFriendRequestService(senderId, targetId);
    }

    target.friendRequests.received.push(senderId);
    sender.friendRequests.sent.push(targetId);

    // Sử dụng notificationService đồng nhất
    await notificationService.createAndPushNotification({
        recipient: targetId,
        sender: senderId,
        type: 'friend_request',
        content: 'đã gửi lời mời kết bạn'
    });

    await Promise.all([target.save(), sender.save()]);
    return { message: 'Đã gửi yêu cầu kết bạn!' };
};

/**
 * Chấp nhận kết bạn
 */
const acceptFriendRequestService = async (userId, senderId) => {
    const [user, sender] = await Promise.all([
        Account.findById(userId),
        Account.findById(senderId)
    ]);

    if (!user || !sender) throw new Error('Người dùng không tồn tại!');

    user.friendRequests.received = user.friendRequests.received.filter(id => id.toString() !== senderId.toString());
    sender.friendRequests.sent = sender.friendRequests.sent.filter(id => id.toString() !== userId.toString());

    if (!user.friends.some(id => id.toString() === senderId.toString())) user.friends.push(senderId);
    if (!sender.friends.some(id => id.toString() === userId.toString())) sender.friends.push(userId);

    await Promise.all([user.save(), sender.save()]);
    return { message: 'Đã chấp nhận lời mời kết bạn!' };
};

/**
 * Từ chối kết bạn
 */
const rejectFriendRequestService = async (userId, senderId) => {
    const [user, sender] = await Promise.all([
        Account.findById(userId),
        Account.findById(senderId)
    ]);

    if (user) {
        user.friendRequests.received = user.friendRequests.received.filter(id => id.toString() !== senderId.toString());
        await user.save();
    }
    if (sender) {
        sender.friendRequests.sent = sender.friendRequests.sent.filter(id => id.toString() !== userId.toString());
        await sender.save();
    }

    return { message: 'Đã từ chối lời mời kết bạn!' };
};

/**
 * Hủy yêu cầu kết bạn đã gửi
 */
const cancelFriendRequestService = async (senderId, targetId) => {
    const [sender, target] = await Promise.all([
        Account.findById(senderId),
        Account.findById(targetId)
    ]);

    if (sender) {
        sender.friendRequests.sent = sender.friendRequests.sent.filter(id => id.toString() !== targetId.toString());
        await sender.save();
    }
    if (target) {
        target.friendRequests.received = target.friendRequests.received.filter(id => id.toString() !== senderId.toString());
        await target.save();
    }

    // Xóa thông báo lời mời kết bạn
    await Notification.deleteMany({ recipient: targetId, sender: senderId, type: 'friend_request' });
    return { message: 'Đã hủy yêu cầu kết bạn!' };
};

/**
 * Xóa bạn bè
 */
const removeFriendService = async (userId, targetId) => {
    const [user, target] = await Promise.all([
        Account.findById(userId),
        Account.findById(targetId)
    ]);

    if (user) {
        user.friends = user.friends.filter(id => id.toString() !== targetId.toString());
        await user.save();
    }
    if (target) {
        target.friends = target.friends.filter(id => id.toString() !== userId.toString());
        await target.save();
    }

    return { message: 'Đã hủy kết bạn!' };
};

/**
 * Theo dõi người dùng
 */
const followUserService = async (followerId, targetId) => {
    if (followerId.toString() === targetId.toString()) throw new Error('Bạn không thể theo dõi chính mình!');

    const [follower, target] = await Promise.all([
        Account.findById(followerId),
        Account.findById(targetId)
    ]);

    if (!follower || !target) throw new Error('Người dùng không tồn tại!');

    if (!follower.following.some(id => id.toString() === targetId.toString())) follower.following.push(targetId);
    if (!target.followers.some(id => id.toString() === followerId.toString())) target.followers.push(followerId);

    // Sử dụng notificationService đồng nhất
    await notificationService.createAndPushNotification({
        recipient: targetId,
        sender: followerId,
        type: 'follow',
        content: 'đã bắt đầu theo dõi bạn'
    });

    await Promise.all([follower.save(), target.save()]);
    return { message: 'Đã theo dõi người dùng này!' };
};

/**
 * Bỏ theo dõi người dùng
 */
const unfollowUserService = async (followerId, targetId) => {
    const [follower, target] = await Promise.all([
        Account.findById(followerId),
        Account.findById(targetId)
    ]);

    if (follower) {
        follower.following = follower.following.filter(id => id.toString() !== targetId.toString());
        await follower.save();
    }
    if (target) {
        target.followers = target.followers.filter(id => id.toString() !== followerId.toString());
        await target.save();
    }

    // Xóa toàn bộ thông báo follow giữa 2 người này để làm sạch
    await Notification.deleteMany({ recipient: targetId, sender: followerId, type: 'follow' });

    return { message: 'Đã bỏ theo dõi!' };
};

/**
 * Lấy danh sách Followers/Following/Friends
 */
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

module.exports = {
    sendFriendRequestService,
    acceptFriendRequestService,
    rejectFriendRequestService,
    cancelFriendRequestService,
    removeFriendService,
    followUserService,
    unfollowUserService,
    getFollowersService,
    getFollowingService,
    getFriendsService,
    getFriendRequestsService
};
