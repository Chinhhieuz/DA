const feedbackService = require('../services/feedbackService');

const handleServiceError = (error, res) => {
    if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message === 'Thiếu thông tin người gửi hoặc nội dung góp ý!') {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
    return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ' });
};

const createFeedback = async (req, res) => {
    try {
        const feedback = await feedbackService.createFeedbackService(req.body);
        return res.status(201).json({ status: 'success', message: 'Cảm ơn bạn đã gửi đóng góp ý kiến!', data: feedback });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getAllFeedback = async (req, res) => {
    try {
        const feedbacks = await feedbackService.getAllFeedbackService();
        return res.status(200).json({ status: 'success', data: feedbacks });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ khi lấy danh sách góp ý' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const feedback = await feedbackService.markAsReadService(req.params.id);
        return res.status(200).json({ status: 'success', message: 'Đã đánh dấu là đã đọc', data: feedback });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

module.exports = {
    createFeedback,
    getAllFeedback,
    markAsRead
};
