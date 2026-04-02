const commentService = require('../services/commentService');

const handleServiceError = (error, res) => {
    if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message.startsWith('FORBIDDEN:')) {
        return res.status(403).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message === 'Vui lòng cung cấp đủ post_id, author_id và nội dung bình luận!') {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
    
    console.error('[COMMENT CONTROLLER] 🚨 Lỗi hệ thống:', error);
    return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ: ' + error.message });
};

const createComment = async (req, res) => {
    try {
        const newComment = await commentService.createCommentService(req.body);
        return res.status(201).json({
            status: 'success',
            message: 'Đăng bình luận thành công!',
            data: newComment
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getCommentsByPost = async (req, res) => {
    try {
        const { postId } = req.params;
        const { userId } = req.query; 
        const comments = await commentService.getCommentsByPostService(postId, userId);
        return res.status(200).json({
            status: 'success',
            data: comments
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getCommentsByUser = async (req, res) => {
    try {
        const comments = await commentService.getCommentsByUserService(req.params.userId);
        return res.status(200).json({ status: 'success', data: comments });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const reactToComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, user_id, type } = req.body;
        
        if (!user_id) {
            return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để thao tác' });
        }

        const comment = await commentService.reactToCommentService({ id, user_id, action, type });
        return res.status(200).json({ status: 'success', data: comment });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const deleteComment = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.body.user_id || req.query.user_id;

        if (!user_id) {
            return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để xóa bình luận' });
        }

        await commentService.deleteCommentService({ id, user_id });
        return res.status(200).json({
            status: 'success',
            message: 'Đã xóa bình luận và các phản hồi liên quan'
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

module.exports = {
    createComment,
    getCommentsByPost,
    getCommentsByUser,
    reactToComment,
    deleteComment
};
