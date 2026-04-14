const Account = require('../models/Account');

const isAdmin = async (req, res, next) => {
    try {
        const bodyAdminId = req.body?.admin_id;
        const queryAdminId = req.query?.admin_id;
        const finalAdminId = bodyAdminId || queryAdminId;

        if (!finalAdminId) {
            return res.status(403).json({ status: 'fail', message: 'Yêu cầu quyền Admin (Thiếu admin_id)!' });
        }

        // Kiểm tra tính hợp lệ của ObjectId để tránh crash khi tìm kiếm
        const mongoose = require('mongoose');
        if (!mongoose.Types.ObjectId.isValid(finalAdminId)) {
            return res.status(400).json({ status: 'fail', message: 'ID Admin không hợp lệ!' });
        }

        const user = await Account.findById(finalAdminId);
        
        if (!user || (user.role && user.role.toLowerCase() !== 'admin')) {
            return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền truy cập chức năng này!' });
        }

        next();
    } catch (error) {
        console.error('[ADMIN MIDDLEWARE] 🚨 Error:', error.message);
        return res.status(500).json({ status: 'error', message: 'Lỗi kiểm tra quyền hạn: ' + error.message });
    }
};

module.exports = { isAdmin };
