const Report = require('../models/Report');
const Post = require('../models/Post');
const Account = require('../models/Account');
const Notification = require('../models/Notification');
const socketModule = require('../socket');

const createReport = async (req, res) => {
    console.log('\n[REPORT CONTROLLER] ================================');
    console.log('[REPORT CONTROLLER] 🚀 Nhận yêu cầu Tố Cáo (Report) bài viết từ User...');
    console.log('[REPORT CONTROLLER] 📦 Dữ liệu đầu vào (req.body):', req.body);
    
    try {
        const { post_id, reporter_id, reason, description, evidence_images } = req.body;

        if (!post_id || !reporter_id || !reason) {
            console.log('[REPORT CONTROLLER] ❌ Lỗi: Thiếu post_id, reporter_id hoặc reason!');
            return res.status(400).json({ status: 'fail', message: 'Vui lòng cung cấp đủ thông tin tố cáo!' });
        }

        console.log(`[REPORT CONTROLLER] 🔍 Đang xác minh tính hợp lệ của Bài viết (${post_id}) và Người tố cáo (${reporter_id})...`);
        const [postExists, userExists] = await Promise.all([
            Post.findById(post_id),
            Account.findById(reporter_id)
        ]);
        
        if (!postExists) {
            console.log('[REPORT CONTROLLER] ❌ Lỗi: Bài viết không tồn tại (Có thể đã bị xoá)!');
            return res.status(404).json({ status: 'fail', message: 'Bài viết không tồn tại!' });
        }
        if (!userExists) {
            console.log('[REPORT CONTROLLER] ❌ Lỗi: Người tố cáo không hợp lệ!');
            return res.status(404).json({ status: 'fail', message: 'Người tố cáo không tồn tại!' });
        }

        console.log('[REPORT CONTROLLER] ✍️ Thỏa điều kiện. Đang lưu Tố cáo vào CSDL chờ Admin duyệt...');
        const newReport = new Report({ 
            post: post_id, 
            reporter: reporter_id, 
            reason,
            description: description || '',
            evidence_images: evidence_images || []
        });
        await newReport.save();
        
        console.log(`[REPORT CONTROLLER] 🎉 Tạo tố cáo thành công! ID Báo cáo: ${newReport._id}`);
        console.log(`[REPORT CONTROLLER] 👉 Nội dung vi phạm được báo cáo: "${reason}"`);
        console.log('[REPORT CONTROLLER] ================================\n');

        return res.status(201).json({ status: 'success', message: 'Đã gửi tố cáo cho Admin kiểm duyệt!', data: newReport });

    } catch (error) {
        console.error('[REPORT CONTROLLER] 🚨 Lỗi hệ thống:', error.message);
        console.log('[REPORT CONTROLLER] ================================\n');
        return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ khi tạo báo cáo!' });
    }
};

const handleReport = async (req, res) => {
    console.log('\n[REPORT CONTROLLER - ADMIN] ========================');
    console.log('[REPORT CONTROLLER] 🛡️ Hệ thống kiểm duyệt: Admin đang giải quyết Tố Cáo...');
    console.log('[REPORT CONTROLLER] 📦 Dữ liệu (req.body):', req.body);
    
    try {
        const { admin_id, report_id, action } = req.body; // action có thể là 'delete_post' hoặc 'warn_user'

        if (!admin_id || !report_id || !action) {
            console.log('[REPORT CONTROLLER] ❌ Lỗi: Thiếu admin_id, report_id hoặc action xử lý!');
            return res.status(400).json({ status: 'fail', message: 'Vui lòng cung cấp đủ thông tin xử lý!' });
        }

        // 1. Kiểm tra quyền Admin bảo mật cao
        console.log(`[REPORT CONTROLLER] 🔐 Đang xác thực quyền lực của Admin (ID: ${admin_id})...`);
        const adminUser = await Account.findById(admin_id);
        if (!adminUser || adminUser.role.toLowerCase() !== 'admin') {
            console.log(`[REPORT CONTROLLER] ❌ LỖI QUYỀN HẠN CẤP ĐỘ CÚ Ý: User (${admin_id}) không phải là Admin! Dám mạo danh!`);
            return res.status(403).json({ status: 'fail', message: 'Bạn không có đặc quyền Admin để thực hiện hành động này!' });
        }
        console.log('[REPORT CONTROLLER] ✅ Đã xác thực đặc quyền Admin thành công!');

        // 2. Lấy thông tin Report
        const report = await Report.findById(report_id).populate('post');
        if (!report) {
            console.log('[REPORT CONTROLLER] ❌ Lỗi: Bản Tố cáo này không tồn tại hoặc đã mất!');
            return res.status(404).json({ status: 'fail', message: 'Tố cáo không tồn tại!' });
        }
        
        if (report.status !== 'pending') {
            console.log(`[REPORT CONTROLLER] ⚠️ Chú ý: Tố cáo này đã mang trạng thái '${report.status}' từ trước!`);
            return res.status(400).json({ status: 'fail', message: 'Tố cáo này đã được xử lý rồi!' });
        }

        // 3. Thi hành Án (Xoá bài hoặc Cảnh cáo)
        let authorId = report.post ? report.post.author : null;
        let postTitle = report.post ? report.post.title : "Bài viết của bạn";

        if (action === 'delete_post') {
            console.log(`[REPORT CONTROLLER] 🔥 HÀNH ĐỘNG: QUYẾT ĐỊNH XÓA BÀI VIẾT VI PHẠM (Post ID: ${report.post ? report.post._id : 'N/A'})...`);
            if (report.post) {
                await Post.findByIdAndDelete(report.post._id);
                console.log('[REPORT CONTROLLER] ✅ HOÀN THÀNH: Đã thanh trừng bài viết vi phạm khỏi hệ thống máy chủ!');
                
                if (authorId) {
                    const notify = new Notification({
                        recipient: authorId,
                        sender: admin_id,
                        type: 'system',
                        content: `[XỬ PHẠT] Bài viết "${postTitle}" của bạn đã bị gỡ bỏ do vi phạm nghiêm trọng quy tắc cộng đồng.`
                    });
                    await notify.save();
                    
                    const io = socketModule.getIO();
                    const connectedUsers = socketModule.getConnectedUsers();
                    const socketId = connectedUsers.get(authorId.toString());
                    console.log(`[REPORT CONTROLLER] 🔍 Kiểm tra Socket cho author ${authorId}: ${socketId || 'KHÔNG TÌM THẤY'}`);
                    if (socketId) {
                        io.to(socketId).emit('new_notification', {
                            id: notify._id,
                            type: 'system',
                            content: notify.content,
                            senderName: 'Hệ thống Admin',
                            sender: { username: 'Admin', avatar_url: '' },
                            postId: report.post?._id,
                            created_at: notify.created_at
                        });
                        console.log(`[REPORT CONTROLLER] 🚀 Đã phát Socket event 'new_notification' tới ${socketId}`);
                    }
                }
            } else {
                console.log('[REPORT CONTROLLER] ⚠️ Bài viết đã bị xóa trước đó.');
            }
        } else if (action === 'warn_user') {
            console.log(`[REPORT CONTROLLER] ⚠️ HÀNH ĐỘNG: GỬI THƯ CẢNH CÁO VÀ ẨN BÀI VIẾT (Tác giả ID: ${authorId || 'N/A'})...`);
            
            if (authorId) {
                // 1. Ẩn bài viết
                if (report.post) {
                    await Post.findByIdAndUpdate(report.post._id, { status: 'hidden' });
                    console.log(`[REPORT CONTROLLER] ✅ Đã ẩn bài viết ${report.post._id}`);
                }

                // 2. Tăng số lần cảnh cáo và kiểm tra khóa tài khoản
                const authorAccount = await Account.findById(authorId);
                if (authorAccount) {
                    authorAccount.warning_count = (authorAccount.warning_count || 0) + 1;
                    
                    let lockMessage = '';
                    if (authorAccount.warning_count >= 3) {
                        authorAccount.is_locked = true;
                        authorAccount.lock_reason = "Vi phạm quy tắc cộng đồng quá 3 lần (Hệ thống tự động khóa)";
                        authorAccount.lock_until = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // Khóa 7 ngày mặc định
                        lockMessage = ` Tài khoản của bạn đã bị TẠM KHÓA trong 7 ngày do vi phạm quá 3 lần.`;
                    }

                    await authorAccount.save();
                    console.log(`[REPORT CONTROLLER] 📈 Số lần cảnh cáo mới của ${authorAccount.username}: ${authorAccount.warning_count}`);

                    const notify = new Notification({
                        recipient: authorId,
                        sender: admin_id,
                        type: 'system',
                        post: report.post ? report.post._id : null,
                        content: `[XỬ PHẠT] Cảnh báo: Bài viết "${postTitle}" của bạn đã bị ẩn do vi phạm cộng đồng. Bạn đã bị cảnh cáo ${authorAccount.warning_count}/3 lần.${lockMessage}`
                    });
                    await notify.save();

                    const io = socketModule.getIO();
                    const connectedUsers = socketModule.getConnectedUsers();
                    const socketId = connectedUsers.get(authorId.toString());
                    if (socketId) {
                        io.to(socketId).emit('new_notification', {
                            id: notify._id,
                            type: 'system',
                            content: notify.content,
                            senderName: 'Hệ thống Admin',
                            sender: { username: 'Admin', avatar_url: '' },
                            postId: report.post?._id,
                            created_at: notify.created_at
                        });
                    }
                }
                console.log('[REPORT CONTROLLER] 📨 Đã thực hiện cảnh cáo và cập nhật trạng thái người dùng!');
            }
        } else if (action === 'dismiss') {
            console.log(`[REPORT CONTROLLER] ✅ HÀNH ĐỘNG: BỎ QUA BÁO CÁO (Report ID: ${report_id}). Bài viết được xác định là an toàn.`);
            // Không làm gì thêm, chỉ để report.status = 'resolved' ở bước 4
        } else {
            console.log(`[REPORT CONTROLLER] ❌ HÀNH ĐỘNG LẠ: Lệnh '${action}' không nằm trong danh mục hỗ trợ!`);
            return res.status(400).json({ status: 'fail', message: 'Hành động không hợp lệ! Xin chọn "dismiss" hoặc "warn_user"' });
        }

        // 4. Cập nhật lại trạng thái Report thành Đã Giải Quyết (resolved)
        report.status = 'resolved';
        await report.save();
        
        console.log(`[REPORT CONTROLLER] 🏁 HỒ SƠ ĐÃ ĐÓNG: Tố cáo này đã chính thức KHÉP LẠI (Resolved)!`);
        console.log('[REPORT CONTROLLER] ================================\n');

        return res.status(200).json({ status: 'success', message: `Đã xử lý thành công với quyết định: ${action}`, data: report });

    } catch (error) {
        console.error('[REPORT CONTROLLER] 🚨 Lỗi hệ thống Nghiêm trọng:', error.message);
        console.log('[REPORT CONTROLLER] ================================\n');
        return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ khi xử lý vi phạm!' });
    }
};

const getPendingReports = async (req, res) => {
    try {
        const { admin_id } = req.query;
        if (!admin_id) {
            return res.status(400).json({ status: 'fail', message: 'Thiếu admin_id!' });
        }
        
        const adminUser = await Account.findById(admin_id);
        if (!adminUser || adminUser.role.toLowerCase() !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Không có quyền Admin!' });
        }

        const reports = await Report.find({ status: 'pending' })
            .populate('reporter', 'username email display_name avatar_url')
            .populate({
                path: 'post',
                populate: { path: 'author', select: 'username email display_name avatar_url' }
            })
            .sort({ created_at: -1 });


        return res.status(200).json({ status: 'success', data: reports });
    } catch (error) {
        console.error('[REPORT CONTROLLER] 🚨 Lỗi fetch reports:', error.message);
        return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ' });
    }
};

module.exports = { createReport, handleReport, getPendingReports };
