const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Account = require('../models/Account');
const Thread = require('../models/Thread');
const Notification = require('../models/Notification');
const socketModule = require('../socket');
const { processMentions } = require('../utils/mentionUtils');

const createComment = async (req, res) => {
    console.log('\n[COMMENT CONTROLLER] ================================');
    console.log('[COMMENT CONTROLLER] 🚀 Nhận yêu cầu tạo bình luận mới...');
    console.log('[COMMENT CONTROLLER] 📦 Dữ liệu đầu vào (req.body):', req.body);
    
    try {
        const { post_id, author_id, content, image_url } = req.body;

        // 1. Kiểm tra đầu vào cơ bản
        if (!post_id || !author_id || !content) {
            console.log('[COMMENT CONTROLLER] ❌ Lỗi: Thiếu post_id, author_id hoặc nội dung bình luận (content)!');
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng cung cấp đủ post_id, author_id và nội dung bình luận!'
            });
        }

        // 2. Kiểm tra sự tồn tại của Post và User
        console.log(`[COMMENT CONTROLLER] 🔍 Đang kiểm tra bài viết (ID: ${post_id}) và người dùng (ID: ${author_id})...`);
        const [postExists, userExists] = await Promise.all([
            Post.findById(post_id),
            Account.findById(author_id)
        ]);
        
        if (!postExists) {
            console.log('[COMMENT CONTROLLER] ❌ Lỗi: Bài viết không tồn tại trong hệ thống!');
            return res.status(404).json({ status: 'fail', message: 'Bài viết không tồn tại!' });
        }
        if (!userExists) {
            console.log('[COMMENT CONTROLLER] ❌ Lỗi: Người dùng không tồn tại!');
            return res.status(404).json({ status: 'fail', message: 'Người bình luận không tồn tại!' });
        }
        
        console.log(`[COMMENT CONTROLLER] ✅ Đã xác nhận Bài viết và Người dùng hợp lệ. Tiếp tục lưu...`);

        // 3. Khởi tạo Comment mới
        console.log('[COMMENT CONTROLLER] ✍️ Đang lưu bình luận vào CSDL...');
        const newComment = new Comment({
            post: post_id,
            author: author_id,
            content: content,
            image_url: image_url || '' // Ảnh đính kèm (nếu có)
        });

        // 4. Lưu Comment
        await newComment.save();
        
        console.log(`[COMMENT CONTROLLER] 🎉 Tạo bình luận thành công! ID Bình luận: ${newComment._id}`);
        if(image_url) {
            console.log(`[COMMENT CONTROLLER] 🖼️  Bình luận CÓ đính kèm ảnh: ${image_url}`);
        } else {
            console.log(`[COMMENT CONTROLLER] 📝 Bình luận KHÔNG có ảnh.`);
        }
        console.log('[COMMENT CONTROLLER] ================================\n');

        // Bắt đầu xử lý nhắc tên (@username)
        processMentions(content, author_id, post_id, postExists.title);

        // Push notification logic
        if (postExists.author.toString() !== author_id) {
            try {
                const recipientAcc = await Account.findById(postExists.author);
                if (recipientAcc && recipientAcc.preferences?.commentNotifications !== false) {
                    const notif = new Notification({
                        recipient: postExists.author,
                        sender: author_id,
                        type: 'comment',
                        post: post_id,
                        content: content.substring(0, 50)
                    });
                    await notif.save();

                    const io = socketModule.getIO();
                    const connectedUsers = socketModule.getConnectedUsers();
                    const recipientSocketId = connectedUsers.get(postExists.author.toString());
                    
                    if (recipientSocketId) {
                        io.to(recipientSocketId).emit('new_notification', {
                            type: 'comment',
                            senderName: userExists.display_name || userExists.username,
                            postId: post_id,
                            title: postExists.title,
                            content: content.substring(0, 50)
                        });
                    }
                }
            } catch(e) {
                console.error('[COMMENT CONTROLLER] Lỗi gửi socket notification:', e);
            }
        }

        // Trả kết quả JSON cho Frontend
        return res.status(201).json({
            status: 'success',
            message: 'Đăng bình luận thành công!',
            data: newComment
        });

    } catch (error) {
        console.error('[COMMENT CONTROLLER] 🚨 Lỗi hệ thống:', error.message);
        console.log('[COMMENT CONTROLLER] ================================\n');
        return res.status(500).json({
            status: 'error',
            message: 'Đã xảy ra lỗi máy chủ trong quá trình gửi bình luận!'
        });
    }
};

const getCommentsByPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.query; // optional: to inject userVote
        const comments = await Comment.find({ post: postId })
            .populate('author', 'username email role avatar_url display_name')
            .sort({ created_at: -1 })
            .lean();
        
        for (let comment of comments) {
            const threads = await Thread.find({ comment: comment._id })
                .populate('author', 'username email role avatar_url display_name')
                .sort({ created_at: 1 });
            comment.threads = threads;

            // Inject userVote so frontend can know what the user reacted
            if (userId && comment.reactions && comment.reactions.length > 0) {
                const userReaction = comment.reactions.find(r => r.user_id && r.user_id.toString() === userId);
                comment.userVote = userReaction ? userReaction.type : null;
            } else {
                comment.userVote = null;
            }
        }

        return res.status(200).json({
            status: 'success',
            data: comments
        });
    } catch (error) {
        console.error('[COMMENT CONTROLLER] 🚨 Lỗi fetch comments:', error.message);
        return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ' });
    }
};

const getCommentsByUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const comments = await Comment.find({ author: userId })
            .populate('post', 'title community')
            .sort({ created_at: -1 });
        return res.status(200).json({ status: 'success', data: comments });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Lỗi lấy bình luận người dùng' });
    }
};

const reactToComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, user_id, type } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để thao tác' });
        }

        const comment = await Comment.findById(id);
        if (!comment) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy bình luận' });

        if (!comment.reactions) comment.reactions = [];

        const existingReactionIndex = comment.reactions.findIndex(r => r.user_id && r.user_id.toString() === user_id);

        if (action === 'unlike' || action === 'undislike') {
            if (existingReactionIndex !== -1) {
                comment.reactions.splice(existingReactionIndex, 1);
            }
        } else {
            const reactionType = type || (action === 'like' || action === 'up' ? 'up' : 'down');
            if (existingReactionIndex !== -1) {
                comment.reactions[existingReactionIndex].type = reactionType;
            } else {
                comment.reactions.push({ user_id: user_id, type: reactionType });
            }
        }

        comment.upvotes = comment.reactions.filter(r => r.type === 'up' || r.type === '👍').length;
        comment.downvotes = comment.reactions.filter(r => r.type === 'down').length;
        comment.markModified('reactions');
        await comment.save();

        // Push notification logic for comment reaction
        if ((action === 'like' || action === 'up') && comment.author.toString() !== user_id) {
            const notif = new Notification({
                recipient: comment.author,
                sender: user_id,
                type: 'like', // Re-using like icon 
                post: comment.post
            });
            await notif.save();

            try {
                const senderAcc = await Account.findById(user_id);
                const io = socketModule.getIO();
                const connectedUsers = socketModule.getConnectedUsers();
                const recipientSocketId = connectedUsers.get(comment.author.toString());
                
                if (recipientSocketId && senderAcc) {
                    io.to(recipientSocketId).emit('new_notification', {
                        type: 'like',
                        senderName: senderAcc.display_name || senderAcc.username,
                        postId: comment.post,
                        title: 'Bình luận của bạn',
                    });
                }
            } catch(e) {
                console.error('[COMMENT CONTROLLER] Lỗi gửi socket notification:', e);
            }
        }

        return res.status(200).json({ status: 'success', data: comment });
    } catch (error) {
        console.error('[COMMENT CONTROLLER] Lỗi reactToComment:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};

const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id: body_user_id } = req.body;
        const { user_id: query_user_id } = req.query;
        const user_id = body_user_id || query_user_id;

        console.log(`[COMMENT CONTROLLER] 🗑️ Nhận yêu cầu xóa bình luận! ID: ${id}, UserID: ${user_id}`);

        if (!user_id) {
            console.log('[COMMENT CONTROLLER] ❌ Lỗi: Thiếu user_id!');
            return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để xóa bình luận' });
        }

        // 2. Tìm comment
        console.log(`[COMMENT CONTROLLER] 🔍 Đang tìm bình luận (ID: ${id})...`);
        const comment = await Comment.findById(id);
        if (!comment) {
            console.log(`[COMMENT CONTROLLER] ❌ Lỗi: Không tìm thấy bình luận ID: ${id}`);
            return res.status(404).json({ status: 'fail', message: 'Không tìm thấy bình luận' });
        }

        // 3. Kiểm tra quyền: Chỉ tác giả mới được xóa (hoặc Admin - nếu cần thêm sau)
        console.log(`[COMMENT CONTROLLER] 🔐 Đang kiểm tra quyền xóa... Author: ${comment.author}, User: ${user_id}`);
        if (!comment.author.equals(user_id)) {
            console.log(`[COMMENT CONTROLLER] ❌ Lỗi: Bạn (User: ${user_id}) không có quyền xóa bình luận của ${comment.author}!`);
            return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền xóa bình luận này' });
        }

        // 4. Xóa tất cả các Thread (phản hồi) liên quan
        console.log(`[COMMENT CONTROLLER] 🗑️ Đang xóa các phản hồi liên quan đến comment ${id}...`);
        const threadDeleteResult = await Thread.deleteMany({ comment: id });
        console.log(`[COMMENT CONTROLLER] ✅ Đã xóa ${threadDeleteResult.deletedCount} phản hồi.`);
        
        // 5. Xóa bình luận
        console.log(`[COMMENT CONTROLLER] 🗑️ Đang xóa bình luận ${id}...`);
        await Comment.findByIdAndDelete(id);

        console.log(`[COMMENT CONTROLLER] 🎉 Xóa bình luận thành công!`);

        return res.status(200).json({
            status: 'success',
            message: 'Đã xóa bình luận và các phản hồi liên quan'
        });
    } catch (error) {
        console.error('[COMMENT CONTROLLER] 🚨 Lỗi deleteComment:', error);
        console.log('[COMMENT CONTROLLER] Stack Trace:', error.stack);
        return res.status(500).json({ status: 'error', message: 'Lỗi server khi xóa bình luận', error: error.message });
    }
};

module.exports = {
    createComment,
    getCommentsByPost,
    getCommentsByUser,
    reactToComment,
    deleteComment
};
