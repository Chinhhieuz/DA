const Post = require('../models/Post');
const Account = require('../models/Account'); // Assume the author uses an Account ID
const Comment = require('../models/Comment');
const Notification = require('../models/Notification');
const socketModule = require('../socket');

const createPost = async (req, res) => {
    console.log('\n[POSTING CONTROLLER] ================================');
    console.log('[POSTING CONTROLLER] 🚀 Nhận yêu cầu tạo bài viết mới...');
    console.log('[POSTING CONTROLLER] 📦 Dữ liệu đầu vào (req.body):', req.body);
    
    try {
        const { author_id, title, content, community, image_url, image_urls } = req.body;

        // 1. Kiểm tra đầu vào cơ bản
        if (!author_id || !title || !content) {
            console.log('[POSTING CONTROLLER] ❌ Lỗi: Thiếu author_id, title hoặc content!');
            return res.status(400).json({
                status: 'fail',
                message: 'Vui lòng cung cấp đủ author_id, tiêu đề và nội dung bài viết!'
            });
        }

        // 2. Kiểm tra xem người dùng có tồn tại không
        console.log(`[POSTING CONTROLLER] 🔍 Đang kiểm tra người dùng với ID: ${author_id}`);
        const userExists = await Account.findById(author_id);
        if (!userExists) {
            console.log('[POSTING CONTROLLER] ❌ Lỗi: Người dùng không tồn tại trong hệ thống!');
            return res.status(404).json({
                status: 'fail',
                message: 'Tài khoản người đăng không tồn tại!'
            });
        }
        console.log(`[POSTING CONTROLLER] ✅ Tìm thấy người dùng: ${userExists.username} (Email: ${userExists.email})`);

        // 3. Khởi tạo bài viết
        console.log('[POSTING CONTROLLER] ✍️ Đang lưu bài viết vào CSDL (Có bao gồm ảnh nếu có)...');
        const newPost = new Post({
            author: author_id,
            title,
            content,
            community: community || 'Chung',
            image_url: image_url || (image_urls && image_urls.length > 0 ? image_urls[0] : ''),
            image_urls: image_urls || [],
            status: 'pending' // Luôn bắt đầu ở trạng thái chờ duyệt
        });

        // 4. Lưu bài viết
        await newPost.save();
        
        console.log(`[POSTING CONTROLLER] 🎉 Tạo bài viết thành công (Trạng thái: PENDING)! ID Bài viết: ${newPost._id}`);
        if(image_urls && image_urls.length > 0) {
            console.log(`[POSTING CONTROLLER] 🖼️  Bài viết CÓ đính kèm ${image_urls.length} ảnh.`);
        } else if(image_url) {
            console.log(`[POSTING CONTROLLER] 🖼️  Bài viết CÓ đính kèm 1 ảnh legacy: ${image_url}`);
        } else {
            console.log(`[POSTING CONTROLLER] 📝 Bài viết KHÔNG có ảnh.`);
        }
        console.log('[POSTING CONTROLLER] ================================\n');

        // Trả kết quả cho client
        return res.status(201).json({
            status: 'success',
            message: 'Đăng bài viết thành công! Bài viết của bạn đang chờ Admin duyệt.',
            data: newPost
        });

    } catch (error) {
        console.error('[POSTING CONTROLLER] 🚨 Lỗi hệ thống:', error.message);
        console.log('[POSTING CONTROLLER] ================================\n');
        return res.status(500).json({
            status: 'error',
            message: 'Đã xảy ra lỗi máy chủ trong quá trình đăng bài!'
        });
    }
};

const getAllPosts = async (req, res) => {
    try {
        const { userId, community } = req.query; // Nhận userId và community từ query params

        let query = { status: 'approved' };
        if (community) {
            query.community = { $regex: new RegExp(`^${community}$`, 'i') };
        }

        // Chỉ lấy các bài viết đã được duyệt (status: 'approved')
        const posts = await Post.find(query)
            .populate('author', 'username email role avatar_url display_name')
            .sort({ created_at: -1 })
            .lean();
            
        // Lấy danh sách following của user hiện tại (nếu có) để check trạng thái follow
        let followingList = [];
        if (userId) {
            const user = await Account.findById(userId).select('following');
            if (user) followingList = (user.following || []).map(id => id.toString());
        }

        // Đếm số lượng bình luận và lấy 1 bình luận mới nhất cho mỗi bài viết
        const postsWithCommentCount = await Promise.all(posts.map(async (post) => {
            const commentCount = await Comment.countDocuments({ post: post._id });
            const recentComments = await Comment.find({ post: post._id })
                .sort({ created_at: -1 })
                .limit(1)
                .populate('author', 'username display_name')
                .lean();
                
            // Inject userVote
            let userVote = null;
            if (userId && post.reactions) {
                const reaction = post.reactions.find(r => r.user_id && r.user_id.toString() === userId);
                if (reaction) userVote = reaction.type;
            }

            // Inject isFollowing
            const authorId = (post.author._id || post.author).toString();
            const isFollowing = userId ? followingList.includes(authorId) : false;

            return {
                ...post,
                author: {
                    ...(post.author._id ? post.author : { _id: post.author }),
                    isFollowing
                },
                commentCount,
                recentComment: recentComments.length > 0 ? recentComments[0] : null,
                userVote
            };
        }));
        
        return res.status(200).json({
            status: 'success',
            data: postsWithCommentCount
        });
    } catch (error) {
        console.error('[POSTING CONTROLLER] 🚨 Lỗi fetch danh sách bài viết:', error.message);
        return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ' });
    }
};

const reactToPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, user_id, type } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để thao tác' });
        }

        const post = await Post.findById(id);
        if (!post) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy bài viết' });

        if (!post.reactions) post.reactions = [];

        const existingReactionIndex = post.reactions.findIndex(r => r.user_id && r.user_id.toString() === user_id);

        if (action === 'unlike' || action === 'undislike') {
            if (existingReactionIndex !== -1) {
                post.reactions.splice(existingReactionIndex, 1);
            }
        } else {
            const reactionType = type || (action === 'like' || action === 'up' ? 'up' : 'down');
            if (existingReactionIndex !== -1) {
                post.reactions[existingReactionIndex].type = reactionType;
            } else {
                post.reactions.push({ user_id: user_id, type: reactionType });
            }
        }

        post.upvotes = post.reactions.filter(r => r.type === 'up' || r.type === '👍').length;
        post.downvotes = post.reactions.filter(r => r.type === 'down').length;
        post.markModified('reactions');
        await post.save();
        
        console.log(`[REACT] Post ${id}: action=${action}, user=${user_id}, up=${post.upvotes}, down=${post.downvotes}`);

        // Push notification logic
        if ((action === 'like' || action === 'up') && post.author.toString() !== user_id) {
            try {
                const recipientAcc = await Account.findById(post.author);
                if (recipientAcc && recipientAcc.preferences?.pushNotifications !== false) {
                    const notif = new Notification({
                        recipient: post.author,
                        sender: user_id,
                        type: 'like',
                        post: post._id
                    });
                    await notif.save();

                    const senderAcc = await Account.findById(user_id);
                    // @ts-ignore
                    const socketModule = require('../socket'); 
                    const io = socketModule.getIO ? socketModule.getIO() : null;
                    const connectedUsers = socketModule.getConnectedUsers ? socketModule.getConnectedUsers() : null;
                    
                    if (io && connectedUsers) {
                        const recipientSocketId = connectedUsers.get(post.author.toString());
                        if (recipientSocketId && senderAcc) {
                            io.to(recipientSocketId).emit('new_notification', {
                                type: 'like',
                                senderName: senderAcc.display_name || senderAcc.username,
                                postId: post._id,
                                title: post.title
                            });
                        }
                    }
                }
            } catch (e) {
                console.error('[POSTING CONTROLLER] Lỗi xử lý notification:', e.message);
            }
        }

        return res.status(200).json({ 
            status: 'success', 
            message: 'Đã cập nhật cảm xúc',
            data: post 
        });
    } catch (error) {
        console.error('[POSTING CONTROLLER] Lỗi reactToPost:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};

const getPendingPosts = async (req, res) => {
    try {
        const posts = await Post.find({ status: 'pending' })
            .populate('author', 'username email display_name avatar_url')
            .sort({ created_at: -1 })
            .lean();
            
        return res.status(200).json({ status: 'success', data: posts });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};

const approvePost = async (req, res) => {
    try {
        const { id } = req.params;
        const post = await Post.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
        
        if (!post) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy bài viết' });
        
        return res.status(200).json({ status: 'success', message: 'Đã duyệt bài viết!', data: post });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};

const rejectPost = async (req, res) => {
    try {
        const { id } = req.params;
        // Có thể chọn xóa luôn hoặc chuyển sang trạng thái rejected
        const post = await Post.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
        
        if (!post) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy bài viết' });
        
        return res.status(200).json({ status: 'success', message: 'Đã từ chối bài viết!', data: post });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};

const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        console.log(`[DELETE POST] 🗑️ Yêu cầu xóa bài viết ${id} từ user ${user_id}`);

        if (!user_id) {
            console.log('[DELETE POST] ❌ Thiếu user_id');
            return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để xóa bài!' });
        }

        const post = await Post.findById(id);
        if (!post) {
            console.log(`[DELETE POST] ❌ Không tìm thấy bài viết ${id}`);
            return res.status(404).json({ status: 'fail', message: 'Không tìm thấy bài viết' });
        }

        // Kiểm tra quyền sở hữu
        if (post.author.toString() !== user_id) {
            console.log(`[DELETE POST] ❌ User ${user_id} không phải là tác giả ${post.author}`);
            return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền xóa bài viết này!' });
        }

        await Post.findByIdAndDelete(id);
        console.log(`[DELETE POST] ✅ Đã xóa bài viết ${id}`);
        
        // Xóa các bình luận liên quan (tùy chọn nhưng nên làm)
        const commentResult = await Comment.deleteMany({ post: id });
        console.log(`[DELETE POST] 💬 Đã xóa ${commentResult.deletedCount} bình luận`);
        
        // Xóa các báo cáo liên quan
        try {
            const Report = require('../models/Report'); 
            const reportResult = await Report.deleteMany({ post: id });
            console.log(`[DELETE POST] 🚩 Đã xóa ${reportResult.deletedCount} báo cáo`);
        } catch (reportErr) {
            console.warn('[DELETE POST] ⚠️ Cảnh báo: Không thể xóa báo cáo (có thể model chưa đúng):', reportErr.message);
        }

        return res.status(200).json({ status: 'success', message: 'Đã xóa bài viết thành công!' });
    } catch (error) {
        console.error('[DELETE POST] 🚨 Lỗi máy chủ khi xóa bài:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ khi xóa bài' });
    }
};

const toggleSavePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;

        if (!user_id) return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để lưu bài!' });

        const user = await Account.findById(user_id);
        if (!user) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy người dùng' });

        if (!user.savedPosts) user.savedPosts = [];

        const isSaved = user.savedPosts.includes(id);
        if (isSaved) {
            user.savedPosts = user.savedPosts.filter(postId => postId.toString() !== id);
            await user.save();
            return res.status(200).json({ status: 'success', message: 'Đã bỏ lưu bài viết', isSaved: false });
        } else {
            user.savedPosts.push(id);
            await user.save();
            return res.status(200).json({ status: 'success', message: 'Đã lưu bài viết thành công!', isSaved: true });
        }
    } catch (error) {
        console.error('[POSTING CONTROLLER] Lỗi toggleSavePost:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};

const getSavedPosts = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await Account.findById(userId).populate({
            path: 'savedPosts',
            populate: { path: 'author', select: 'username display_name avatar_url' }
        });

        if (!user) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy người dùng' });

        // Lọc bỏ bài viết đã bị xóa (nếu có trong savedPosts nhưng fetch ra null)
        const validPosts = user.savedPosts.filter(p => p !== null);
        
        // Lấy danh sách following của user hiện tại (nếu có)
        let followingList = [];
        if (userId) {
            const user = await Account.findById(userId).select('following');
            if (user) followingList = (user.following || []).map(id => id.toString());
        }

        // Đếm comment và check reaction (tương tự getAllPosts)
        const postsWithDetails = await Promise.all(validPosts.map(async (post) => {
            const commentCount = await Comment.countDocuments({ post: post._id });
            const recentComments = await Comment.find({ post: post._id })
                .sort({ created_at: -1 })
                .limit(1)
                .populate('author', 'username display_name')
                .lean();
            
            // Inject userVote
            let userVote = null;
            const postObj = post.toObject();
            if (userId && postObj.reactions) {
                const reaction = postObj.reactions.find(r => r.user_id && r.user_id.toString() === userId);
                if (reaction) userVote = reaction.type;
            }

            // Inject isFollowing
            const authorId = (postObj.author._id || postObj.author).toString();
            const isFollowing = userId ? followingList.includes(authorId) : false;
                
            return {
                ...postObj,
                author: {
                    ...(postObj.author._id ? postObj.author : { _id: postObj.author }),
                    isFollowing
                },
                commentCount,
                recentComment: recentComments.length > 0 ? recentComments[0] : null,
                userVote
            };
        }));

        return res.status(200).json({ status: 'success', data: postsWithDetails });
    } catch (error) {
        console.error('[POSTING CONTROLLER] Lỗi getSavedPosts:', error);
        return res.status(500).json({ status: 'error', message: 'Lỗi server' });
    }
};

module.exports = {
    createPost,
    getAllPosts,
    reactToPost,
    getPendingPosts,
    approvePost,
    rejectPost,
    deletePost,
    toggleSavePost,
    getSavedPosts
};
