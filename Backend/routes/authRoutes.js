const express = require('express');
const authController = require('../controllers/authController');
const { loginValidation, registerValidation } = require('../middlewares/validateMiddleware');

const router = express.Router();

// Định tuyến phương thức POST cho chức năng đăng nhập
router.post('/login', loginValidation, authController.login);

// Định tuyến xử lý việc đăng kí (Yêu cầu tài khoản dạng Admin sau này sẽ làm middlewares)
router.post('/register', registerValidation, authController.register);

// Định tuyến cập nhật thông tin cá nhân (ảnh, bio, tên...)
router.put('/profile', authController.updateProfile);
// Lấy tất cả thông tin profile gộp lại
router.get('/profile/aggregated/:userId', authController.getAggregatedProfile);
// Lấy thông tin cá nhân của một user bất kỳ
router.get('/profile/:userId', authController.getProfile);

// Định tuyến quên mật khẩu
router.post('/forgot-password', authController.forgotPassword);

// Định tuyến đặt lại mật khẩu bằng token
router.post('/reset-password', authController.resetPassword);

// Định tuyến cập nhật cài đặt ưu tiên
router.put('/settings', authController.updateSettings);

// Định tuyến đổi mật khẩu
router.put('/change-password', authController.changePassword);

// Định tuyến lấy thống kê người dùng (số bài viết, lượt thích)
router.get('/stats/:userId', authController.getUserStats);

// --- Hệ thống Bạn bè (Legacy) & Người theo dõi (New) ---
// Follower System (New)
router.post('/friends/follow', authController.followUser);
router.post('/friends/unfollow', authController.unfollowUser);
router.get('/friends/followers/:userId', authController.getFollowers);
router.get('/friends/following/:userId', authController.getFollowing);

// Friend System (Legacy)
// Gửi yêu cầu kết bạn
router.post('/friends/request', authController.sendFriendRequest);
// Chấp nhận yêu cầu kết bạn
router.post('/friends/accept', authController.acceptFriendRequest);
// Từ chối yêu cầu kết bạn
router.post('/friends/reject', authController.rejectFriendRequest);
// Hủy kết bạn
router.post('/friends/remove', authController.removeFriend);
// Lấy danh sách bạn bè
router.get('/friends/:userId', authController.getFriends);
// Lấy danh sách yêu cầu kết bạn đã nhận
router.get('/friends/requests/:userId', authController.getFriendRequests);
// Hủy yêu cầu kết bạn (người gửi hủy)
router.post('/friends/cancel', authController.cancelFriendRequest);

// Tìm kiếm người dùng theo tên/username
router.get('/search/users', authController.searchUsers);

module.exports = router;