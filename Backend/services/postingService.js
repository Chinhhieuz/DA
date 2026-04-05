const Post = require('../models/Post');
const Account = require('../models/Account'); 
const Comment = require('../models/Comment');
const Thread = require('../models/Thread');
const Notification = require('../models/Notification');
const socketModule = require('../socket');
const { formatPostData } = require('../utils/postFormatter');
const mongoose = require('mongoose');

const getPostCommentAndThreadCount = async (postId) => {
    const baseCommentCount = await Comment.countDocuments({ post: postId });
    const commentIds = await Comment.distinct('_id', { post: postId });
    const threadCount = await Thread.countDocuments({ comment: { $in: commentIds } });
    return baseCommentCount + threadCount;
};

const createPostService = async (postData) => {
    const { author_id, title, content, community, image_url, image_urls } = postData;

    if (!author_id || !title || !content) {
        throw new Error('Vui lòng cung cấp đủ author_id, tiêu đề và nội dung bài viết!');
    }

    const userExists = await Account.findById(author_id);
    if (!userExists) throw new Error('NOT_FOUND:Tài khoản người đăng không tồn tại!');

    const newPost = new Post({
        author: author_id,
        title,
        content,
        community: community || 'Chung',
        image_url: image_url || (image_urls && image_urls.length > 0 ? image_urls[0] : ''),
        image_urls: image_urls || [],
        status: 'pending'
    });

    await newPost.save();
    return newPost;
};

const getAllPostsService = async ({ userId, community }) => {
    let query = { status: 'approved' };
    if (community) {
        query.community = { $regex: new RegExp(`^${community}$`, 'i') };
    }

    const posts = await Post.find(query)
        .populate('author', 'username email role avatar_url display_name')
        .sort({ created_at: -1 })
        .lean();
        
    let followingList = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const user = await Account.findById(userId).select('following');
        if (user) followingList = (user.following || []).map(id => id.toString());
    }

    const postsWithDetails = await Promise.all(posts.map(async (post) => {
        const commentCount = await getPostCommentAndThreadCount(post._id);
        const recentComments = await Comment.find({ post: post._id })
            .sort({ created_at: -1 })
            .limit(1)
            .populate('author', 'username display_name')
            .lean();
            
        let userVote = null;
        if (userId && post.reactions) {
            const reaction = post.reactions.find(r => r.user_id && r.user_id.toString() === userId);
            if (reaction) userVote = reaction.type;
        }

        const authorId = post.author ? (post.author._id || post.author).toString() : null;
        const isFollowing = (userId && authorId) ? followingList.includes(authorId) : false;

        return formatPostData(post, commentCount, recentComments, userVote, isFollowing);
    }));
    
    return postsWithDetails;
};

const getTrendingPostsService = async (userId) => {
    const posts = await Post.find({ status: 'approved' })
        .populate('author', 'username email role avatar_url display_name')
        .sort({ upvotes: -1, created_at: -1 })
        .limit(5)
        .lean();

    let followingList = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const user = await Account.findById(userId).select('following');
        if (user) followingList = (user.following || []).map(id => id.toString());
    }

    const trendingPosts = await Promise.all(posts.map(async (post) => {
        const commentCount = await getPostCommentAndThreadCount(post._id);
        const recentComments = await Comment.find({ post: post._id })
            .sort({ created_at: -1 })
            .limit(1)
            .populate('author', 'username display_name')
            .lean();
            
        let userVote = null;
        if (userId && post.reactions) {
            const reaction = post.reactions.find(r => r.user_id && r.user_id.toString() === userId);
            if (reaction) userVote = reaction.type;
        }

        const authorId = post.author ? (post.author._id || post.author).toString() : null;
        const isFollowing = (userId && authorId) ? followingList.includes(authorId) : false;

        return formatPostData(post, commentCount, recentComments, userVote, isFollowing);
    }));

    return trendingPosts;
};

const reactToPostService = async ({ id, user_id, action, type }) => {
    const post = await Post.findById(id);
    if (!post) throw new Error('NOT_FOUND:Không tìm thấy bài viết');
    
    if (post.status !== 'approved') {
        throw new Error('FORBIDDEN:Bài viết này đã bị khóa!');
    }

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
            console.error('[POSTING SERVICE] Lỗi xử lý notification:', e.message);
        }
    }

    return post;
};

const getPendingPostsService = async () => {
    return await Post.find({ status: 'pending' })
        .populate('author', 'username email display_name avatar_url')
        .sort({ created_at: -1 })
        .lean();
};

const approvePostService = async (id) => {
    const post = await Post.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
    if (!post) throw new Error('NOT_FOUND:Không tìm thấy bài viết');
    return post;
};

const rejectPostService = async (id) => {
    const post = await Post.findByIdAndUpdate(id, { status: 'rejected' }, { new: true });
    if (!post) throw new Error('NOT_FOUND:Không tìm thấy bài viết');
    return post;
};

const deletePostService = async ({ id, user_id }) => {
    const post = await Post.findById(id);
    if (!post) throw new Error('NOT_FOUND:Không tìm thấy bài viết');

    if (post.author.toString() !== user_id) {
        throw new Error('FORBIDDEN:Bạn không có quyền xóa bài viết này!');
    }

    await Post.findByIdAndDelete(id);
    await Comment.deleteMany({ post: id });
    
    try {
        const Report = require('../models/Report'); 
        await Report.deleteMany({ post: id });
    } catch (e) {}

    return id;
};

const toggleSavePostService = async ({ id, user_id }) => {
    const user = await Account.findById(user_id);
    if (!user) throw new Error('NOT_FOUND:Không tìm thấy người dùng');

    if (!user.savedPosts) user.savedPosts = [];

    const isSaved = user.savedPosts.includes(id);
    if (isSaved) {
        user.savedPosts = user.savedPosts.filter(postId => postId.toString() !== id);
        await user.save();
        return { isSaved: false };
    } else {
        user.savedPosts.push(id);
        await user.save();
        return { isSaved: true };
    }
};

const getSavedPostsService = async (userId) => {
    const user = await Account.findById(userId).populate({
        path: 'savedPosts',
        populate: { path: 'author', select: 'username display_name avatar_url' }
    });

    if (!user) throw new Error('NOT_FOUND:Không tìm thấy người dùng');

    const validPosts = (user.savedPosts || []).filter(p => p !== null);
    
    let followingList = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const acc = await Account.findById(userId).select('following');
        if (acc) followingList = (acc.following || []).map(id => id.toString());
    }

    const postsWithDetails = await Promise.all(validPosts.map(async (post) => {
        const commentCount = await getPostCommentAndThreadCount(post._id);
        const recentComments = await Comment.find({ post: post._id })
            .sort({ created_at: -1 })
            .limit(1)
            .populate('author', 'username display_name')
            .lean();
        
        let userVote = null;
        const postObj = typeof post.toObject === 'function' ? post.toObject() : post;
        if (userId && postObj.reactions) {
            const reaction = postObj.reactions.find(r => r.user_id && r.user_id.toString() === userId);
            if (reaction) userVote = reaction.type;
        }

        const authorId = postObj.author ? (postObj.author._id || postObj.author).toString() : null;
        const isFollowing = (userId && authorId) ? followingList.includes(authorId) : false;
            
        return formatPostData(postObj, commentCount, recentComments, userVote, isFollowing);
    }));

    return postsWithDetails;
};

const searchPostsService = async ({ q, userId }) => {
    if (!q) return [];

    const query = {
        status: 'approved',
        $or: [
            { title: { $regex: q, $options: 'i' } },
            { content: { $regex: q, $options: 'i' } },
            { community: { $regex: q, $options: 'i' } }
        ]
    };

    const posts = await Post.find(query)
        .populate('author', 'username email role avatar_url display_name')
        .sort({ created_at: -1 })
        .limit(20)
        .lean();

    let followingList = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const user = await Account.findById(userId).select('following');
        if (user) followingList = (user.following || []).map(id => id.toString());
    }

    const formattedResults = await Promise.all(posts.map(async (post) => {
        const commentCount = await getPostCommentAndThreadCount(post._id);
        const recentComments = await Comment.find({ post: post._id })
            .sort({ created_at: -1 })
            .limit(1)
            .populate('author', 'username display_name')
            .lean();

        let userVote = null;
        if (userId && post.reactions) {
            const reaction = post.reactions.find(r => r.user_id && r.user_id.toString() === userId);
            if (reaction) userVote = reaction.type;
        }

        const authorId = post.author ? (post.author._id || post.author).toString() : null;
        const isFollowing = (userId && authorId) ? followingList.includes(authorId) : false;

        return formatPostData(post, commentCount, recentComments, userVote, isFollowing);
    }));

    return formattedResults;
};

const getCommunityPostsAdminService = async ({ communityName, admin_id }) => {
    if (!admin_id) {
        throw new Error('FORBIDDEN:Bạn không có quyền thực hiện hành động này!');
    }

    const posts = await Post.find({ 
        community: { $regex: new RegExp(`^${communityName}$`, 'i') } 
    })
    .populate('author', 'username email role avatar_url display_name')
    .sort({ created_at: -1 })
    .lean();

    return posts;
};

const getPostByIdService = async ({ id, userId }) => {
    const post = await Post.findById(id)
        .populate('author', 'username email role avatar_url display_name')
        .lean();

    if (!post) throw new Error('NOT_FOUND:Không tìm thấy bài viết');

    let isFollowing = false;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const user = await Account.findById(userId).select('following');
        if (user) {
            const followingList = (user.following || []).map(id => id.toString());
            const authorId = post.author ? (post.author._id || post.author).toString() : null;
            isFollowing = (authorId && followingList) ? followingList.includes(authorId) : false;
        }
    }

    const [commentCount, recentComments] = await Promise.all([
        getPostCommentAndThreadCount(post._id),
        Comment.find({ post: post._id }).sort({ created_at: -1 }).limit(1).populate('author', 'username display_name').lean()
    ]);

    let userVote = null;
    if (userId && post.reactions) {
        const reaction = post.reactions.find(r => r.user_id && r.user_id.toString() === userId);
        if (reaction) userVote = reaction.type;
    }

    return formatPostData(post, commentCount, recentComments, userVote, isFollowing);
};

module.exports = {
    createPostService,
    getAllPostsService,
    getTrendingPostsService,
    reactToPostService,
    getPendingPostsService,
    approvePostService,
    rejectPostService,
    deletePostService,
    toggleSavePostService,
    getSavedPostsService,
    searchPostsService,
    getCommunityPostsAdminService,
    getPostByIdService
};
