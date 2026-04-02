const Feedback = require('../models/Feedback');

const createFeedbackService = async ({ user_id, content, type }) => {
    if (!user_id || !content) {
        throw new Error('Thiếu thông tin người gửi hoặc nội dung góp ý!');
    }

    const newFeedback = new Feedback({
        user: user_id,
        content,
        type: type || 'suggestion'
    });

    await newFeedback.save();
    return newFeedback;
};

const getAllFeedbackService = async () => {
    const feedbacks = await Feedback.find()
        .populate('user', 'username full_name email avatar_url')
        .sort({ created_at: -1 });
    return feedbacks;
};

const markAsReadService = async (id) => {
    const feedback = await Feedback.findByIdAndUpdate(id, { status: 'read' }, { new: true });
    if (!feedback) throw new Error('NOT_FOUND:Không tìm thấy góp ý');
    return feedback;
};

module.exports = {
    createFeedbackService,
    getAllFeedbackService,
    markAsReadService
};
