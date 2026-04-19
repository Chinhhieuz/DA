const postingService = require('../services/postingService');

const handleServiceError = (error, res) => {
    if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message.startsWith('FORBIDDEN:')) {
        return res.status(403).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message.startsWith('VALIDATION:')) {
        return res.status(400).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message === 'Vui lòng cung cấp đủ author_id, tiêu đề và nội dung bài viết!') {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
    
    console.error('[POSTING CONTROLLER] 🚨 Lỗi hệ thống:', error.message);
    return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ: ' + error.message });
};

const createPost = async (req, res) => {
    try {
        // Đảm bảo body luôn là một object, không được là null
        const postData = req.body || {};
        const mediaFiles = req.files || {};
        const imageFiles = Array.isArray(mediaFiles.image) ? mediaFiles.image : [];
        const videoFile = Array.isArray(mediaFiles.video) ? mediaFiles.video[0] : null;
        
        console.log('[CREATE POST CONTROLLER] Incoming Body Keys:', Object.keys(postData));
        console.log('[CREATE POST CONTROLLER] Image Files Count:', imageFiles.length);
        console.log('[CREATE POST CONTROLLER] Has Video File:', !!videoFile);
        
        const newPost = await postingService.createPostService(postData, { imageFiles, videoFile });
        
        let message = 'Đã đăng bài viết thành công!';
        if (newPost.status === 'pending') {
            message = 'Bài viết của bạn đang chờ Admin kiểm duyệt.';
        }

        return res.status(201).json({
            status: 'success',
            message: message,
            data: newPost
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getAllPosts = async (req, res) => {
    try {
        const posts = await postingService.getAllPostsService({ 
            userId: req.query.userId, 
            community: req.query.community,
            followingOnly: req.query.followingOnly,
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 1,
            skip: req.query.skip !== undefined ? parseInt(req.query.skip) : undefined
        });
        return res.status(200).json({ status: 'success', data: posts });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getTrendingPosts = async (req, res) => {
    try {
        const trendingPosts = await postingService.getTrendingPostsService(req.query.userId);
        return res.status(200).json({ status: 'success', data: trendingPosts });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const reactToPost = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, user_id, type } = req.body;
        if (!user_id) {
            return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để thao tác' });
        }
        
        const post = await postingService.reactToPostService({ id, user_id, action, type });
        return res.status(200).json({ 
            status: 'success', 
            message: 'Đã cập nhật cảm xúc',
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
        const admin_id = req.user?.id || req.body.admin_id;
        const post = await postingService.approvePostService(req.params.id, admin_id);
        return res.status(200).json({ status: 'success', message: 'Đã duyệt bài viết!', data: post });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const rejectPost = async (req, res) => {
    try {
        const admin_id = req.user?.id || req.body.admin_id;
        const { reason } = req.body;
        const post = await postingService.rejectPostService(req.params.id, admin_id, reason);
        return res.status(200).json({ status: 'success', message: 'Đã từ chối bài viết!', data: post });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const deletePost = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.query.user_id || req.body.user_id;
        
        console.log(`[DELETE POST CONTROLLER] 🗑️ Yêu cầu xóa bài: ${id}`);
        console.log(`[DELETE POST CONTROLLER] 👤 User ID nhận được: ${user_id}`);
        
        if (!user_id) return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để xóa bài!' });

        await postingService.deletePostService({ id, user_id });
        console.log(`[DELETE POST CONTROLLER] ✅ Xóa thành công bài: ${id}`);
        return res.status(200).json({ status: 'success', message: 'Đã xóa bài viết thành công!' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const toggleSavePost = async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.body;
        if (!user_id) return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để lưu bài!' });

        const result = await postingService.toggleSavePostService({ id, user_id });
        const message = result.isSaved ? 'Đã lưu bài viết thành công!' : 'Đã bỏ lưu bài viết';
        return res.status(200).json({ status: 'success', message, isSaved: result.isSaved });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getSavedPosts = async (req, res) => {
    try {
        const posts = await postingService.getSavedPostsService(req.params.userId);
        return res.status(200).json({ status: 'success', data: posts });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const searchPosts = async (req, res) => {
    try {
        const { q, keyword, userId } = req.query;
        const searchKeyword = keyword || q; // Hỗ trợ cả 2 tên tham số
        const results = await postingService.searchPostsService({ keyword: searchKeyword, userId });
        return res.status(200).json({ status: 'success', data: results });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getCommunityPostsAdmin = async (req, res) => {
    try {
        const posts = await postingService.getCommunityPostsAdminService({ 
            communityName: req.params.communityName, 
            admin_id: req.query.admin_id 
        });
        return res.status(200).json({ status: 'success', results: posts.length, data: posts });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getPostById = async (req, res) => {
    try {
        const post = await postingService.getPostByIdService({ 
            id: req.params.id, 
            userId: req.query.userId 
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
