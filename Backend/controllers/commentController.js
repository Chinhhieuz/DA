const commentService = require('../services/commentService');

const handleServiceError = (error, res) => {
    const message = String(error?.message || 'Unknown error');

    if (message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: message.split(':')[1] });
    }
    if (message.startsWith('FORBIDDEN:')) {
        return res.status(403).json({ status: 'fail', message: message.split(':')[1] });
    }

    console.error('[COMMENT CONTROLLER] Error:', message);
    return res.status(500).json({ status: 'error', message: 'Server error: ' + message });
};

const createComment = async (req, res) => {
    try {
        const authUserId = String(req.user?._id || '').trim();
        if (!authUserId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const payload = {
            post_id: req.body?.post_id,
            content: req.body?.content,
            image_url: req.body?.image_url
        };

        const newComment = await commentService.createCommentService(payload, authUserId);
        return res.status(201).json({
            status: 'success',
            message: 'Dang binh luan thanh cong!',
            data: newComment
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getCommentsByPost = async (req, res) => {
    try {
        const { postId } = req.params;
        // Neu co token: dung req.user de tinh userVote.
        // Neu khong co token: fallback query userId (tuong thich nguoc).
        const userId = req.user?._id
            ? String(req.user._id)
            : String(req.query?.userId || '').trim();
        const comments = await commentService.getCommentsByPostService(postId, userId);
        return res.status(200).json({ status: 'success', data: comments });
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
        const { action, type } = req.body;
        const user_id = req.user?._id ? String(req.user._id) : '';

        if (!user_id) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
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
        const user_id = req.user?._id ? String(req.user._id) : '';

        if (!user_id) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        await commentService.deleteCommentService({ id, user_id });
        return res.status(200).json({
            status: 'success',
            message: 'Da xoa binh luan va cac phan hoi lien quan'
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
