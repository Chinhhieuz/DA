const threadService = require('../services/threadService');

const handleServiceError = (error, res) => {
    const message = String(error?.message || 'Unknown error');

    if (message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: message.split(':')[1] });
    }
    if (message.startsWith('FORBIDDEN:')) {
        return res.status(403).json({ status: 'fail', message: message.split(':')[1] });
    }

    console.error('[THREAD CONTROLLER] Error:', message);
    return res.status(500).json({ status: 'error', message: 'Server error: ' + message });
};

const createThread = async (req, res) => {
    try {
        const authUserId = String(req.user?._id || '').trim();
        if (!authUserId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const payload = {
            comment_id: req.body?.comment_id,
            content: req.body?.content,
            image_url: req.body?.image_url
        };

        const newThread = await threadService.createThreadService(payload, authUserId);
        return res.status(201).json({
            status: 'success',
            message: 'Tra loi binh luan thanh cong!',
            data: newThread
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const deleteThread = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user?._id ? String(req.user._id) : '';

        if (!user_id) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        await threadService.deleteThreadService({ id, user_id });
        return res.status(200).json({ status: 'success', message: 'Da xoa phan hoi thanh cong' });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const reactToThread = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, type } = req.body;
        const user_id = req.user?._id ? String(req.user._id) : '';

        if (!user_id) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const thread = await threadService.reactToThreadService({ id, user_id, action, type });
        return res.status(200).json({ status: 'success', data: thread });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

module.exports = {
    createThread,
    deleteThread,
    reactToThread
};
