const isAdmin = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const role = String(req.user.role || '').toLowerCase();
        if (role !== 'admin') {
            return res.status(403).json({ status: 'fail', message: 'Ban khong co quyen truy cap chuc nang nay!' });
        }
        return next();
    } catch (error) {
        console.error('[ADMIN MIDDLEWARE] Error:', error.message);
        return res.status(500).json({ status: 'error', message: 'Loi kiem tra quyen han: ' + error.message });
    }
};

module.exports = { isAdmin };
