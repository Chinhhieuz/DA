const postingService = require('../services/postingService');
const { getFromCache, setInCache } = require('../utils/memoryCache');

const handleServiceError = (error, res) => {
    const message = String(error?.message || 'Unknown error');

    if (message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: message.split(':')[1] });
    }
    if (message.startsWith('FORBIDDEN:')) {
        return res.status(403).json({ status: 'fail', message: message.split(':')[1] });
    }
    if (message.startsWith('VALIDATION:')) {
        return res.status(400).json({ status: 'fail', message: message.split(':')[1] });
    }

    console.error('[POSTING CONTROLLER] Error:', message);
    return res.status(500).json({ status: 'error', message: 'Server error: ' + message });
};

// Uu tien lay userId tu token. Query userId chi la fallback de tuong thich nguoc.
const resolveRequestUserId = (req) => {
    const fromToken = req.user?._id ? String(req.user._id) : '';
    if (fromToken) return fromToken;
    return String(req.query?.userId || '').trim();
};

const createPost = async (req, res) => {
    try {
        const postData = req.body || {};
        // Khong tin author_id tu client; backend gan author theo token dang nhap.
        const authUserId = req.user?._id ? String(req.user._id) : '';
        if (authUserId) postData.author_id = authUserId;

        const mediaFiles = req.files || {};
        const imageFiles = Array.isArray(mediaFiles.image) ? mediaFiles.image : [];
        const videoFile = Array.isArray(mediaFiles.video) ? mediaFiles.video[0] : null;

        const newPost = await postingService.createPostService(postData, { imageFiles, videoFile });

        let message = 'Da dang bai viet thanh cong!';
        if (newPost.status === 'pending') {
            message = 'Bai viet cua ban dang cho Admin kiem duyet.';
        }

        return res.status(201).json({
            status: 'success',
            message,
            data: newPost
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getAllPosts = async (req, res) => {
    try {
        // Cac endpoint GET co ca che do guest va che do co token.
        // Neu co token, service se tra ve du lieu ca nhan hoa (userVote/isFollowing).
        const requestUserId = resolveRequestUserId(req);
        const result = await postingService.getAllPostsService({
            userId: requestUserId,
            community: req.query.community,
            followingOnly: req.query.followingOnly,
            limit: req.query.limit,
            page: req.query.page
        });

        if (Array.isArray(result)) {
            return res.status(200).json({ status: 'success', data: result });
        }

        return res.status(200).json({
            status: 'success',
            data: result.posts || [],
            meta: {
                page: result.page,
                limit: result.limit,
                hasMore: result.hasMore
            }
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getTrendingPosts = async (req, res) => {
    try {
        // Trending van public, nhung neu co token se duoc ca nhan hoa thong tin follow/vote.
        const requestUserId = resolveRequestUserId(req);
        const cacheKey = `trendingPosts_${requestUserId || 'anonymous'}`;
        let trendingPosts = getFromCache(cacheKey);

        if (!trendingPosts) {
            trendingPosts = await postingService.getTrendingPostsService(requestUserId);
            setInCache(cacheKey, JSON.parse(JSON.stringify(trendingPosts)), 300); // 5 minutes Cache
        }
        
        return res.status(200).json({ status: 'success', data: trendingPosts });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const reactToPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, type } = req.body;
        const user_id = req.user?._id ? String(req.user._id) : '';

        if (!user_id) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const post = await postingService.reactToPostService({ id, user_id, action, type });
        return res.status(200).json({
            status: 'success',
            message: 'Da cap nhat cam xuc',
            data: post
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getPendingPosts = async (req, res) => {
    try {
        const posts = await postingService.getPendingPostsService();
        return res.status(200).json({ status: 'success', data: posts });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const approvePost = async (req, res) => {
    try {
        const admin_id = req.user?._id ? String(req.user._id) : '';
        if (!admin_id) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }
        const post = await postingService.approvePostService(req.params.id, admin_id);
        return res.status(200).json({ status: 'success', message: 'Da duyet bai viet!', data: post });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const rejectPost = async (req, res) => {
    try {
        const admin_id = req.user?._id ? String(req.user._id) : '';
        if (!admin_id) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }
        const { reason } = req.body;
        const post = await postingService.rejectPostService(req.params.id, admin_id, reason);
        return res.status(200).json({ status: 'success', message: 'Da tu choi bai viet!', data: post });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user?._id ? String(req.user._id) : '';

        if (!user_id) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        await postingService.deletePostService({ id, user_id });
        return res.status(200).json({ status: 'success', message: 'Da xoa bai viet thanh cong!' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const toggleSavePost = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user?._id ? String(req.user._id) : '';

        if (!user_id) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const result = await postingService.toggleSavePostService({ id, user_id });
        const message = result.isSaved ? 'Da luu bai viet thanh cong!' : 'Da bo luu bai viet';
        return res.status(200).json({ status: 'success', message, isSaved: result.isSaved });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getSavedPosts = async (req, res) => {
    try {
        const requestedUserId = String(req.params.userId || '').trim();
        const currentUserId = req.user?._id ? String(req.user._id) : '';
        const currentRole = String(req.user?.role || '').toLowerCase();

        if (!currentUserId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        if (requestedUserId && requestedUserId !== currentUserId && currentRole !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Ban khong co quyen xem danh sach bai luu cua nguoi khac' });
        }

        const posts = await postingService.getSavedPostsService(requestedUserId || currentUserId);
        return res.status(200).json({ status: 'success', data: posts });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const searchPosts = async (req, res) => {
    try {
        const { q, keyword } = req.query;
        const searchKeyword = keyword || q;
        // Search khong can truyen userId tren query nua, uu tien token.
        const requestUserId = resolveRequestUserId(req);
        const results = await postingService.searchPostsService({ keyword: searchKeyword, userId: requestUserId });
        return res.status(200).json({ status: 'success', data: results });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getCommunityPostsAdmin = async (req, res) => {
    try {
        const admin_id = req.user?._id ? String(req.user._id) : '';
        if (!admin_id) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }
        const posts = await postingService.getCommunityPostsAdminService({
            communityName: req.params.communityName,
            admin_id
        });
        return res.status(200).json({ status: 'success', results: posts.length, data: posts });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getPostById = async (req, res) => {
    try {
        // Lay chi tiet bai viet theo id, co the ca nhan hoa neu request da dang nhap.
        const requestUserId = resolveRequestUserId(req);
        const post = await postingService.getPostByIdService({
            id: req.params.id,
            userId: requestUserId
        });
        return res.status(200).json({ status: 'success', data: post });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

module.exports = {
    createPost,
    getAllPosts,
    getTrendingPosts,
    reactToPost,
    getPendingPosts,
    approvePost,
    rejectPost,
    deletePost,
    toggleSavePost,
    getSavedPosts,
    searchPosts,
    getCommunityPostsAdmin,
    getPostById
};
