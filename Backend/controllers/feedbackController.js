const Feedback = require('../models/Feedback');

const createFeedback = async (req, res) => {
    try {
        const { user_id, content, type } = req.body;
        if (!user_id || !content) {
            return res.status(400).json({ status: 'fail', message: 'Thiếu thông tin người gửi hoặc nội dung góp ý!' });
        }

        const newFeedback = new Feedback({
            user: user_id,
            content,
            type: type || 'suggestion'
        });

        await newFeedback.save();
        res.status(201).json({ status: 'success', message: 'Cảm ơn bạn đã gửi đóng góp ý kiến!', data: newFeedback });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Lỗi máy chủ khi gửi góp ý' });
    }
};

const getAllFeedback = async (req, res) => {
    try {
        const feedbacks = await Feedback.find()
            .populate('user', 'username full_name email avatar_url')
            .sort({ created_at: -1 });
        res.status(200).json({ status: 'success', data: feedbacks });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Lỗi máy chủ khi lấy danh sách góp ý' });
    }
};

const markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const feedback = await Feedback.findByIdAndUpdate(id, { status: 'read' }, { new: true });
        if (!feedback) return res.status(404).json({ status: 'fail', message: 'Không tìm thấy góp ý' });
        res.status(200).json({ status: 'success', message: 'Đã đánh dấu là đã đọc', data: feedback });
    } catch (error) {
        res.status(500).json({ status: 'error', message: 'Lỗi máy chủ khi cập nhật trạng thái' });
    }
};

module.exports = {
    createFeedback,
    getAllFeedback,
    markAsRead
};
