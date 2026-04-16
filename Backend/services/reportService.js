const Report = require('../models/Report');
const Post = require('../models/Post');
const Account = require('../models/Account');
const Comment = require('../models/Comment');
const Thread = require('../models/Thread');
const Notification = require('../models/Notification');
const notificationService = require('./notificationService');
const postingService = require('./postingService');

const createReportService = async ({ post_id, reporter_id, reason, description, evidence_images }) => {
    if (!post_id || !reporter_id || !reason) {
        throw new Error('Vui lòng cung cấp đủ thông tin tố cáo!');
    }

    const [postExists, userExists] = await Promise.all([
        Post.findById(post_id),
        Account.findById(reporter_id)
    ]);
    
    if (!postExists) throw new Error('NOT_FOUND:Bài viết không tồn tại!');
    if (!userExists) throw new Error('NOT_FOUND:Người tố cáo không tồn tại!');

    const newReport = new Report({ 
        post: post_id, 
        reporter: reporter_id, 
        reason,
        description: description || '',
        evidence_images: evidence_images || []
    });
    
    await newReport.save();
    return newReport;
};

const handleReportService = async ({ admin_id, report_id, action }) => {
    if (!admin_id || !report_id || !action) {
        throw new Error('Vui lòng cung cấp đủ thông tin xử lý!');
    }

    const adminUser = await Account.findById(admin_id);
    if (!adminUser || adminUser.role.toLowerCase() !== 'admin') {
        throw new Error('FORBIDDEN:Bạn không có đặc quyền Admin để thực hiện hành động này!');
    }

    const report = await Report.findById(report_id).populate('post');
    if (!report) {
        throw new Error('NOT_FOUND:Tố cáo không tồn tại!');
    }
    
    if (report.status !== 'pending') {
        throw new Error('Tố cáo này đã được xử lý rồi!');
    }

    let authorId = report.post ? report.post.author : null;
    let postTitle = report.post ? report.post.title : "Bài viết của bạn";

    if (action === 'delete_post') {
        if (report.post) {
            const postId = report.post._id;
            
            // Sử dụng dịch vụ xóa bài viết chuẩn đã được gia cố
            await postingService.deletePostService({ id: postId, user_id: admin_id });
            
            if (authorId) {
                await notificationService.createAndPushNotification({
                    recipient: authorId,
                    sender: admin_id,
                    type: 'system',
                    post: postId,
                    content: `[XỬ PHẠT] Bài viết "${postTitle}" của bạn đã bị gỡ bỏ do vi phạm nghiêm trọng quy tắc cộng đồng.`
                });
            }
        }
    } else if (action === 'warn_user') {
        if (authorId) {
            if (report.post) {
                await Post.findByIdAndUpdate(report.post._id, { status: 'hidden' });
            }

            const authorAccount = await Account.findById(authorId);
            if (authorAccount) {
                authorAccount.warning_count = (authorAccount.warning_count || 0) + 1;
                
                let lockMessage = '';
                if (authorAccount.warning_count >= 3) {
                    authorAccount.is_locked = true;
                    authorAccount.lock_reason = "Vi phạm quy tắc cộng đồng quá 3 lần (Hệ thống tự động khóa)";
                    authorAccount.lock_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                    lockMessage = ` Tài khoản của bạn đã bị TẠM KHÓA trong 7 ngày do vi phạm quá 3 lần.`;
                }

                await authorAccount.save();

                await notificationService.createAndPushNotification({
                    recipient: authorId,
                    sender: admin_id,
                    type: 'system',
                    post: report.post ? report.post._id : null,
                    content: `[XỬ PHẠT] Cảnh báo: Bài viết "${postTitle}" của bạn đã bị ẩn do vi phạm cộng đồng. Bạn đã bị cảnh cáo ${authorAccount.warning_count}/3 lần.${lockMessage}`
                });
            }
        }
    } else if (action === 'dismiss') {
        // Do nothing basically
    } else {
        throw new Error('Hành động không hợp lệ! Xin chọn "dismiss" hoặc "warn_user" hoặc "delete_post"');
    }

    report.status = 'resolved';
    await report.save();
    return report;
};

const getPendingReportsService = async (admin_id) => {
    if (!admin_id) {
        throw new Error('Thiếu admin_id!');
    }
    
    const adminUser = await Account.findById(admin_id);
    if (!adminUser || adminUser.role.toLowerCase() !== 'admin') {
        throw new Error('FORBIDDEN:Không có quyền Admin!');
    }

    const reports = await Report.find({ status: 'pending' })
        .populate('reporter', 'username email full_name avatar_url')
        .populate({
            path: 'post',
            populate: { path: 'author', select: 'username email full_name avatar_url' }
        })
        .sort({ created_at: -1 });

    return reports;
};

module.exports = {
    createReportService,
    handleReportService,
    getPendingReportsService
};
