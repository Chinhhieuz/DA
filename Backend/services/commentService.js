const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Account = require('../models/Account');
const Thread = require('../models/Thread');
const Notification = require('../models/Notification');
const socketModule = require('../socket');
const notificationService = require('./notificationService');
const { processMentions } = require('../utils/mentionUtils');

const createCommentService = async (commentData) => {
    const { post_id, author_id, content, image_url } = commentData;

    if (!post_id || !author_id || !content) {
        throw new Error('Vui lòng cung cấp đủ post_id, author_id và nội dung bình luận!');
    }

    const [postExists, userExists] = await Promise.all([
        Post.findById(post_id),
        Account.findById(author_id)
    ]);
    
    if (!postExists) throw new Error('NOT_FOUND:Bài viết không tồn tại!');
    if (postExists.status !== 'approved') throw new Error('FORBIDDEN:Bài viết này đã bị khóa bình luận!');
    if (!userExists) throw new Error('NOT_FOUND:Người bình luận không tồn tại!');
    
    const newComment = new Comment({
        post: post_id,
        author: author_id,
        content: content,
        image_url: image_url || ''
    });

    await newComment.save();
    
    // Bắt đầu xử lý nhắc tên (@username)
    processMentions(content, author_id, post_id, postExists.title);

    // Push notification logic
    if (postExists.author.toString() !== author_id) {
        await notificationService.createAndPushNotification({
            recipient: postExists.author,
            sender: author_id,
            type: 'comment',
            post: post_id,
            comment: newComment._id,
            content: `đã bình luận: ${content.substring(0, 50)}`,
            customPayload: { title: postExists.title }
        });
    }

    return newComment;
};

const getCommentsByPostService = async (postId, userId) => {
    const comments = await Comment.find({ post: postId })
        .populate('author', 'username email role avatar_url full_name')
        .sort({ upvotes: -1, created_at: -1 })
        .lean();
    
    for (let comment of comments) {
        const threads = await Thread.find({ comment: comment._id })
            .populate('author', 'username email role avatar_url full_name')
            .sort({ created_at: 1 })
            .lean();
            
        // Xử lý userVote cho từng thread
        comment.threads = threads.map(thread => {
            let userVote = null;
            if (userId && thread.reactions && thread.reactions.length > 0) {
                const reaction = thread.reactions.find(r => r.user_id && r.user_id.toString() === userId);
                userVote = reaction ? reaction.type : null;
            }
            return { ...thread, id: thread._id.toString(), userVote };
        });

        if (userId && comment.reactions && comment.reactions.length > 0) {
            const userReaction = comment.reactions.find(r => r.user_id && r.user_id.toString() === userId);
            comment.userVote = userReaction ? userReaction.type : null;
        } else {
            comment.userVote = null;
        }
    }

    return comments;
};

const getCommentsByUserService = async (userId) => {
    const comments = await Comment.find({ author: userId })
        .populate('post', 'title community')
        .sort({ created_at: -1 });
    return comments;
};

const reactToCommentService = async ({ id, user_id, action, type }) => {
    const comment = await Comment.findById(id);
    if (!comment) throw new Error('NOT_FOUND:Không tìm thấy bình luận');

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

    if ((action === 'like' || action === 'up') && comment.author.toString() !== user_id) {
        await notificationService.createAndPushNotification({
            recipient: comment.author,
            sender: user_id,
            type: 'like',
            post: comment.post,
            comment: comment._id,
            customPayload: { title: 'Bình luận của bạn' }
        });
    }

    return comment;
};

const deleteCommentService = async ({ id, user_id }) => {
    const comment = await Comment.findById(id);
    if (!comment) throw new Error('NOT_FOUND:Không tìm thấy bình luận');

    if (!comment.author.equals(user_id)) {
        throw new Error('FORBIDDEN:Bạn không có quyền xóa bình luận này');
    }

    // Xử lý xóa dây chuyền (Threads)
    const threads = await Thread.find({ comment: id });
    for (const thread of threads) {
        await notificationService.deleteNotificationsByThread(thread._id);
    }
    await Thread.deleteMany({ comment: id });

    // Xóa thông báo của chính bình luận này
    await notificationService.deleteNotificationsByComment(id);

    await Comment.findByIdAndDelete(id);
    
    return id;
};

module.exports = {
    createCommentService,
    getCommentsByPostService,
    getCommentsByUserService,
    reactToCommentService,
    deleteCommentService
};
