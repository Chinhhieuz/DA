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
    
    if (postOfComment.author.toString() !== author_id) {
        throw new Error('FORBIDDEN:Chỉ có tác giả bài viết mới được trả lời các bình luận trong bài viết của mình!');
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

    await Thread.findByIdAndDelete(id);
    return id;
};

module.exports = {
    createThreadService,
    deleteThreadService
};
