const threadService = require('../services/threadService');

const handleServiceError = (error, res) => {
    if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message.startsWith('FORBIDDEN:')) {
        return res.status(403).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message === 'Vui lòng cung cấp đủ comment_id, author_id và nội dung phản hồi!') {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
    
    console.error('[THREAD CONTROLLER] 🚨 Lỗi hệ thống:', error.message);
    return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ: ' + error.message });
};

const createThread = async (req, res) => {
    try {
        const newThread = await threadService.createThreadService(req.body);
        return res.status(201).json({
            status: 'success',
            message: 'Tác giả đã trả lời bình luận thành công!',
            data: newThread
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const deleteThread = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.body.user_id || req.query.user_id;

        if (!user_id) {
            return res.status(400).json({ status: 'fail', message: 'Cần đăng nhập để xóa phản hồi' });
        }

        await threadService.deleteThreadService({ id, user_id });
        return res.status(200).json({
            status: 'success',
            message: 'Đã xóa phản hồi thành công'
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

module.exports = {
    createThread,
    deleteThread
};
