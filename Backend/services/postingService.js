const Post = require('../models/Post');
const Account = require('../models/Account'); 
const Comment = require('../models/Comment');
const Thread = require('../models/Thread');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const socketModule = require('../socket');
const aiModerationService = require('./aiModerationService');
const notificationService = require('./notificationService');
const { formatPostData } = require('../utils/postFormatter');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;

// Cấu hình Cloudinary (Dùng chung cho cả route upload cũ và mới)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Helper: Tải ảnh lên Cloudinary từ Buffer sử dụng Stream
 */
const uploadStreamToCloudinary = (fileBuffer, options = {}) => {
    const { resourceType = 'image' } = options;
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: 'social-media-uploads',
                resource_type: resourceType
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result.secure_url || result.url);
            }
        );
        stream.end(fileBuffer);
    });
};

const getPostCommentAndThreadCount = async (postId) => {
    const baseCommentCount = await Comment.countDocuments({ post: postId });
    const commentIds = await Comment.distinct('_id', { post: postId });
    const threadCount = await Thread.countDocuments({ comment: { $in: commentIds } });
    return baseCommentCount + threadCount;
};

const createPostService = async (postDataInput, mediaFiles = {}) => {
    // 🛡️ PHÒNG THỦ TỐI ĐA: Ép kiểu về Object ngay lập tức
    const postData = postDataInput || {};
    const { author_id, title, content, community } = postData;
    let { image_urls = [], video_url = '' } = postData;
    const imageFilesRaw = Array.isArray(mediaFiles.imageFiles) ? mediaFiles.imageFiles : [];
    const imageFiles = imageFilesRaw.filter(file => file?.mimetype?.startsWith('image/'));
    const videoFile = mediaFiles.videoFile && mediaFiles.videoFile.mimetype?.startsWith('video/')
        ? mediaFiles.videoFile
        : null;

    if (typeof image_urls === 'string') image_urls = image_urls ? [image_urls] : [];
    if (!Array.isArray(image_urls)) image_urls = [];
    if (Array.isArray(video_url)) video_url = video_url[0] || '';
    if (!author_id || !title || !content) {
        console.error('[POST SERVICE] Thiếu dữ liệu:', { author_id, title, hasContent: !!content });
        throw new Error('Bạn chưa điền đầy đủ tiêu đề hoặc nội dung cho bài viết này!');
    }

    const userExists = await Account.findById(author_id);
    if (!userExists) throw new Error('NOT_FOUND:Tài khoản người đăng không tồn tại!');

    if (imageFilesRaw.length !== imageFiles.length) {
        throw new Error('VALIDATION:Chỉ cho phép file ảnh trong trường image');
    }
    if (mediaFiles.videoFile && !videoFile) {
        throw new Error('VALIDATION:Chỉ cho phép file video trong trường video');
    }

    // 1️⃣ TẠO VÀ LƯU BÀI VIẾT NGAY LẬP TỨC VỚI STATUS PENDING (SIÊU TỐC)
    const newPost = new Post({
        author: author_id,
        title,
        content,
        community: community || 'Chung',
        // Sẽ được cập nhật sau khi Cloudinary xong
        image_url: '',
        image_urls: [],
        video_url: '',
        status: 'pending',
        ai_system_note: 'Hệ thống đang xử lý media và kiểm duyệt AI...'
    });

    await newPost.save();

    // 2️⃣ KÍCH HOẠT SONG SONG: KIỂM DUYỆT AI & TẢI ẢNH LÊN CLOUDINARY (ASYNCHRONOUS)
    (async () => {
        try {
            // Chuẩn bị dữ liệu cho AI (Nếu có file thô thì dùng Buffer cho nhanh)
            // AI se dung uploadedUrls va frame trich tu video sau khi upload xong
            
            // Chạy song song: (1) AI quét ảnh & (2) Up ảnh lên Cloudinary
            const uploadImagesPromise = imageFiles.length > 0
                ? Promise.all(imageFiles.map(f => uploadStreamToCloudinary(f.buffer, { resourceType: 'image' })))
                : Promise.resolve(image_urls);
            const uploadVideoPromise = videoFile?.buffer
                ? uploadStreamToCloudinary(videoFile.buffer, { resourceType: 'video' })
                : Promise.resolve(video_url || '');

            const [uploadedUrls, uploadedVideoUrl] = await Promise.all([uploadImagesPromise, uploadVideoPromise]);
            const aiDecision = await aiModerationService.checkContent(
                title,
                content,
                uploadedUrls,
                uploadedVideoUrl ? [uploadedVideoUrl] : []
            );

            // 🚦 Cập nhật nội dung bài viết dựa trên phán quyết AI và Link ảnh thật
            newPost.image_urls = uploadedUrls;
            newPost.image_url = uploadedUrls.length > 0 ? uploadedUrls[0] : '';
            newPost.video_url = uploadedVideoUrl || '';
            
            if (aiDecision.status === 'PASS') {
                newPost.status = 'approved';
                newPost.ai_system_note = '';
            } else {
                newPost.status = 'pending'; // Giữ pending nếu AI Reject
                newPost.ai_system_note = aiDecision.reason || 'Bị AI từ chối chặn';
            }

            await newPost.save();

            // 📡 Thông báo cho người dùng qua Socket.io (Room-based)
            try {
                const io = socketModule.getIO();
                if (io) {
                    const rIdStr = author_id.toString();
                    io.to(rIdStr).emit('post_ai_result', {
                        postId: newPost._id,
                        status: newPost.status,
                        reason: newPost.ai_system_note,
                        image_urls: uploadedUrls,
                        video_url: newPost.video_url
                    });
                    console.log(`📡 [AI_RESULT] Gửi tới Room: ${rIdStr}`);
                }
            } catch (sErr) {}

        } catch (error) {
            console.error('[POST ASYNC SERVICE] 🚨 Lỗi xử lý ngầm:', error.message);
            newPost.ai_system_note = 'Lỗi trong quá trình xử lý media.';
            await newPost.save();
        }
    })();

    return newPost;
};

const getAllPostsService = async ({ userId, community, followingOnly }) => {
    let query = { status: 'approved' };
    if (community) {
        query.community = { $regex: new RegExp(`^${community}$`, 'i') };
    }

    let followingList = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const user = await Account.findById(userId).select('following');
        if (user) followingList = (user.following || []).map(id => id.toString());
    }

    // Nếu chỉ lấy từ người đang theo dõi
    if (followingOnly === 'true' && userId) {
        query.author = { $in: followingList };
    }

    console.log(`[POST SERVICE] Step 1: Querying posts (Community: ${community || 'all'}, FollowingOnly: ${followingOnly || 'false'})`);
    const posts = await Post.find(query)
        .populate('author', 'username email role avatar_url display_name')
        .sort({ created_at: -1 })
        .lean();
    console.log(`[POST SERVICE] Step 2: Found ${posts.length} posts.`);

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

const searchPostsService = async ({ keyword, userId }) => {
    if (!keyword) return [];
    
    // Tìm kiếm trong title hoặc content bài viết
    const query = {
        status: 'approved',
        $or: [
            { title: { $regex: keyword, $options: 'i' } },
            { content: { $regex: keyword, $options: 'i' } }
        ]
    };

    const posts = await Post.find(query)
        .populate('author', 'username email role avatar_url display_name')
        .sort({ created_at: -1 })
        .lean();

    let followingList = [];
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        const user = await Account.findById(userId).select('following');
        if (user) followingList = (user.following || []).map(id => id.toString());
    }

    // Map thêm commentCount và userVote tương tự getAllPostsService
    return await Promise.all(posts.map(async (post) => {
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

    // Push notification logic using unified service
    if ((action === 'like' || action === 'up') && post.author.toString() !== user_id) {
        await notificationService.createAndPushNotification({
            recipient: post.author,
            sender: user_id,
            type: 'like',
            post: post._id,
            customPayload: { title: post.title }
        });
    }

    return post;
};

const getPendingPostsService = async () => {
    return await Post.find({ status: 'pending' })
        .populate('author', 'username email display_name avatar_url')
        .sort({ created_at: -1 })
        .lean();
};

const approvePostService = async (id, admin_id) => {
    const post = await Post.findByIdAndUpdate(id, { status: 'approved' }, { new: true });
    if (!post) throw new Error('NOT_FOUND:Không tìm thấy bài viết');
    
    // Gửi thông báo cho tác giả
    await notificationService.createAndPushNotification({
        recipient: post.author,
        sender: admin_id,
        type: 'system',
        post: post._id,
        content: `Bài viết "${post.title}" của bạn đã được phê duyệt!`,
        customPayload: { title: 'Thông báo xét duyệt' }
    });

    return post;
};

const rejectPostService = async (id, admin_id, reason) => {
    const post = await Post.findByIdAndUpdate(id, { 
        status: 'rejected', 
        ai_system_note: reason || 'Nội dung không phù hợp quy tắc cộng đồng.' 
    }, { new: true });
    
    if (!post) throw new Error('NOT_FOUND:Không tìm thấy bài viết');
    
    // Gửi thông báo cho tác giả
    await notificationService.createAndPushNotification({
        recipient: post.author,
        sender: admin_id,
        type: 'system',
        post: post._id,
        content: `Bài viết "${post.title}" của bạn đã bị từ chối. Lý do: ${reason || 'Vi phạm quy tắc cộng đồng.'}`,
        customPayload: { title: 'Thông báo xét duyệt' }
    });

    return post;
};

const deletePostService = async ({ id, user_id }) => {
    const post = await Post.findById(id);
    if (!post) throw new Error('NOT_FOUND:Không tìm thấy bài viết');

    if (post.author.toString() !== user_id && post.author._id?.toString() !== user_id) {
        // Nếu là Admin thì chấp nhận xóa
        const currentUser = await Account.findById(user_id);
        if (!currentUser || currentUser.role.toLowerCase() !== 'admin') {
            throw new Error('FORBIDDEN:Bạn không có quyền xóa bài viết này!');
        }
    }

    // 1. Xóa toàn bộ thông báo liên quan đến bài viết này
    await notificationService.deleteNotificationsByPost(id);

    // 2. Xóa các dữ liệu liên hoàn (Comments & Threads)
    const commentIds = await Comment.distinct('_id', { post: id });
    for (const cid of commentIds) {
        await notificationService.deleteNotificationsByComment(cid);
    }
    
    const threads = await Thread.find({ comment: { $in: commentIds } });
    for (const thread of threads) {
        await notificationService.deleteNotificationsByThread(thread._id);
    }

    await Thread.deleteMany({ comment: { $in: commentIds } });
    await Comment.deleteMany({ post: id });

    // 3. Xóa các Tố cáo liên quan (Reports Cleanup)
    await Report.deleteMany({ post: id });

    // 4. Xóa chính bài viết
    await Post.findByIdAndDelete(id);
    
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

