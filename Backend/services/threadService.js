const Thread = require('../models/Thread');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Account = require('../models/Account');
const { processMentions } = require('../utils/mentionUtils');
const notificationService = require('./notificationService');

const createThreadService = async ({ comment_id, author_id, content, image_url }) => {
    if (!comment_id || !author_id || !content) {
        throw new Error('Vui lòng cung cấp đủ comment_id, author_id và nội dung phản hồi!');
    }

    const [commentExists, userExists] = await Promise.all([
        Comment.findById(comment_id),
        Account.findById(author_id)
    ]);
    
    if (!commentExists) throw new Error('NOT_FOUND:Bình luận gốc không tồn tại!');
    if (!userExists) throw new Error('NOT_FOUND:Người phản hồi không tồn tại!');

    const postOfComment = await Post.findById(commentExists.post);
    if (!postOfComment) {
        throw new Error('NOT_FOUND:Bài viết gốc chứa bình luận này không còn tồn tại!');
    }
    
    if (postOfComment.status !== 'approved') {
        throw new Error('FORBIDDEN:Bài viết này đã bị khóa bình luận!');
    }
    
    const newThread = new Thread({
        comment: comment_id,
        author: author_id,
        content: content,
        image_url: image_url || ''
    });

    await newThread.save();
    
    // Push notification logic using our new generalized service
    if (commentExists.author.toString() !== author_id) {
        await notificationService.createAndPushNotification({
            recipient: commentExists.author,
            sender: author_id,
            type: 'comment',
            post: commentExists.post,
            comment: comment_id,
            thread: newThread._id,
            content: `đã phản hồi: ${content.substring(0, 50)}`,
            customPayload: { title: 'Bình luận của bạn' }
        });
    }

    processMentions(content, author_id, commentExists.post, postOfComment.title);

    return newThread;
};

const deleteThreadService = async ({ id, user_id }) => {
    const thread = await Thread.findById(id);
    if (!thread) {
        throw new Error('NOT_FOUND:Không tìm thấy phản hồi');
    }

    if (!thread.author.equals(user_id)) {
        throw new Error('FORBIDDEN:Bạn không có quyền xóa phản hồi này');
    }

    // Xóa thông báo liên quan tới thread này
    await notificationService.deleteNotificationsByThread(id);

    await Thread.findByIdAndDelete(id);
    return id;
};

const reactToThreadService = async ({ id, user_id, action, type }) => {
    const thread = await Thread.findById(id).populate('comment');
    if (!thread) throw new Error('NOT_FOUND:Không tìm thấy phản hồi');

    if (!thread.reactions) thread.reactions = [];

    const existingReactionIndex = thread.reactions.findIndex(r => r.user_id && r.user_id.toString() === user_id);

    if (action === 'unlike' || action === 'undislike') {
        if (existingReactionIndex !== -1) {
            thread.reactions.splice(existingReactionIndex, 1);
        }
    } else {
        const reactionType = type || (action === 'like' || action === 'up' ? 'up' : 'down');
        if (existingReactionIndex !== -1) {
            thread.reactions[existingReactionIndex].type = reactionType;
        } else {
            thread.reactions.push({ user_id: user_id, type: reactionType });
        }
    }

    thread.upvotes = thread.reactions.filter(r => r.type === 'up' || r.type === '👍').length;
    thread.downvotes = thread.reactions.filter(r => r.type === 'down').length;
    thread.markModified('reactions');
    await thread.save();

    // Thông báo nếu là "Thích"
    if ((action === 'like' || action === 'up') && thread.author.toString() !== user_id) {
        // Tìm postId từ comment cha
        let postId = null;
        if (thread.comment && thread.comment.post) {
            postId = thread.comment.post;
        }

        await notificationService.createAndPushNotification({
            recipient: thread.author,
            sender: user_id,
            type: 'like',
            post: postId,
            comment: thread.comment ? thread.comment._id : null,
            thread: thread._id,
            customPayload: { title: 'Phản hồi của bạn' }
        });
    }

    return thread;
};

module.exports = {
    createThreadService,
    deleteThreadService,
    reactToThreadService
};
