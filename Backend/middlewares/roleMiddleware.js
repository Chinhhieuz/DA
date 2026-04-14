/**
 * Middleware phân quyền (Role-Based Access Control - RBAC)
 * @param  {...string} roles - Các vai trò được phép truy cập (vd: 'admin', 'moderator')
 */
const restrictTo = (...roles) => {
    return (req, res, next) => {
        // req.user phải được gán bởi Auth Middleware trước khi chạy đến đây
        if (!req.user || !roles.includes(req.user.role.toLowerCase())) {
            return res.status(403).json({
                status: 'fail',
                message: 'Bạn không có quyền thực hiện hành động này!'
            });
        }
        next();
    };
};

module.exports = { restrictTo };
