const Thread = require('../models/Thread');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Account = require('../models/Account');
const Notification = require('../models/Notification');
const socketModule = require('../socket');
const { processMentions } = require('../utils/mentionUtils');

const createThread = async (req, res) => {
    console.log('\n[THREAD CONTROLLER] ================================');
    console.log('[THREAD CONTROLLER] 🚀 Nhận yêu cầu tạo phản hồi (Thread) mới...');
    console.log('[THREAD CONTROLLER] 📦 Dữ liệu đầu vào (req.body):', req.body);
    
    try {
        const { comment_id, author_id, content, image_url } = req.body;

        // 1. Kiểm tra đầu vào
        if (!comment_id || !author_id || !content) {
            console.log('[THREAD CONTROLLER] ❌ Lỗi: Thiếu comment_id, author_id hoặc nội dung!');
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng cung cấp đủ comment_id, author_id và nội dung phản hồi!'
            });
        }

        // 2. Kiểm tra sự tồn tại của Comment gốc và Người dùng phản hồi
        console.log(`[THREAD CONTROLLER] 🔍 Đang kiểm tra Comment gốc (ID: ${comment_id}) và Người dùng (ID: ${author_id})...`);
        const [commentExists, userExists] = await Promise.all([
            Comment.findById(comment_id),
            Account.findById(author_id)
        ]);
        
        if (!commentExists) {
            console.log('[THREAD CONTROLLER] ❌ Lỗi: Bình luận gốc không tồn tại!');
            return res.status(404).json({ status: 'fail', message: 'Bình luận gốc không tồn tại!' });
        }
        if (!userExists) {
            console.log('[THREAD CONTROLLER] ❌ Lỗi: Người dùng không tồn tại!');
            return res.status(404).json({ status: 'fail', message: 'Người phản hồi không tồn tại!' });
        }

        // 3. Kiểm tra xem Người dùng này CÓ PHẢI là "Người đăng Bài Post" không
        // Lấy bài Post của cái commentExists
        console.log(`[THREAD CONTROLLER] 🔐 Đang xác thực quyền hạn (Chỉ User đăng bài mới được phép trả lời)...`);
        const postOfComment = await Post.findById(commentExists.post);
        if (!postOfComment) {
            console.log('[THREAD CONTROLLER] ❌ Lỗi: Bài viết gốc chứa bình luận này không còn!');
            return res.status(404).json({ status: 'fail', message: 'Bài viết gốc chứa bình luận này không còn tồn tại!' });
        }
        
        if (postOfComment.author.toString() !== author_id) {
            console.log(`[THREAD CONTROLLER] ❌ LỖI QUYỀN HẠN: Người trả lời (${author_id}) KHÔNG PHẢI là người đăng bài viết gốc (${postOfComment.author._id || postOfComment.author}). Yêu cầu bị từ chối!`);
            return res.status(403).json({ status: 'fail', message: 'Chỉ có tác giả bài viết mới được trả lời các bình luận trong bài viết của mình!' });
        }
        
        console.log('[THREAD CONTROLLER] ✅ Hoàn tất: Xác nhận ĐÚNG Tác giả bài đăng đang trả lời bình luận!');

        // 4. Khởi tạo Phản hồi (Thread)
        console.log('[THREAD CONTROLLER] ✍️ Đang lưu trạng thái Thread vào CSDL...');
        const newThread = new Thread({
            comment: comment_id,
            author: author_id,
            content: content,
            image_url: image_url || '' // Ảnh đính kèm của tác giả
        });

        // 5. Lưu Phản hồi
        await newThread.save();
        
        console.log(`[THREAD CONTROLLER] 🎉 Tạo phản hồi thành công! ID Phản hồi: ${newThread._id}`);

        // Push notification logic: Notify original comment author
        if (commentExists.author.toString() !== author_id) {
            try {
                const recipientAcc = await Account.findById(commentExists.author);
                if (recipientAcc && recipientAcc.preferences?.commentNotifications !== false) {
                    const notif = new Notification({
                        recipient: commentExists.author,
                        sender: author_id,
                        type: 'comment', // Re-use comment type for threads
                        post: commentExists.post,
                        content: `đã phản hồi: ${content.substring(0, 50)}`
                    });
                    await notif.save();

                    const io = socketModule.getIO();
                    const connectedUsers = socketModule.getConnectedUsers();
                    const recipientSocketId = connectedUsers.get(commentExists.author.toString());
                    
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit('new_notification', {
                            type: 'comment',
                            senderName: userExists.display_name || userExists.username,
                            postId: commentExists.post,
                            title: 'Bình luận của bạn',
                            content: `đã phản hồi: ${content.substring(0, 50)}`
                        });
                    }
                }
            } catch (e) {
                console.error('[THREAD CONTROLLER] Lỗi gửi notification:', e);
            }
        }

        if(image_url) {
            console.log(`[THREAD CONTROLLER] 🖼️  Phản hồi CÓ đính kèm ảnh: ${image_url}`);
        } else {
            console.log(`[THREAD CONTROLLER] 📝 Phản hồi KHÔNG có ảnh.`);
        }
        console.log('[THREAD CONTROLLER] ================================\n');

        // Bắt đầu xử lý nhắc tên (@username)
        processMentions(content, author_id, commentExists.post, postOfComment.title);

        return res.status(201).json({
            status: 'success',
            message: 'Tác giả đã trả lời bình luận thành công!',
            data: newThread
        });

    } catch (error) {
        console.error('[THREAD CONTROLLER] 🚨 Lỗi hệ thống:', error.message);
        console.log('[THREAD CONTROLLER] ================================\n');
        return res.status(500).json({
            status: 'error',
            message: 'Đã xảy ra lỗi máy chủ trong quá trình đăng phản hồi!'
        });
    }
};

const deleteThread = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id: body_user_id } = req.body;
        const { user_id: query_user_id } = req.query;
        const user_id = body_user_id || query_user_id;

        if (!user_id) {
            return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để xóa phản hồi' });
        }

        const thread = await Thread.findById(id);
        if (!thread) {
            return res.status(404).json({ status: 'fail', message: 'Không tìm thấy phản hồi' });
        }

        // Kiểm tra quyền: Chỉ tác giả mới được xóa
        if (!thread.author.equals(user_id)) {
            return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền xóa phản hồi này' });
        }

        await Thread.findByIdAndDelete(id);

        return res.status(200).json({
            status: 'success',
            message: 'Đã xóa phản hồi thành công'
        });
    } catch (error) {
        console.error('[THREAD CONTROLLER] Lỗi deleteThread:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server khi xóa phản hồi' });
    }
};

module.exports = {
    createThread,
    deleteThread
};
