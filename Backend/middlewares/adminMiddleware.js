const Account = require('../models/Account');

const isAdmin = async (req, res, next) => {
    try {
        const { admin_id } = req.body || {};
        const queryAdminId = req.query.admin_id;
        const finalAdminId = admin_id || queryAdminId;

        if (!finalAdminId) {
            return res.status(403).json({ status: 'fail', message: 'Yêu cầu quyền Admin (Thiếu admin_id)!' });
        }

        const user = await Account.findById(finalAdminId);
        
        if (!user || user.role.toLowerCase() !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Bạn không có quyền truy cập chức năng này!' });
        }

        next();
    } catch (error) {
        return res.status(500).json({ status: 'error', message: 'Lỗi kiểm tra quyền hạn!' });
    }
};

module.exports = { isAdmin };
