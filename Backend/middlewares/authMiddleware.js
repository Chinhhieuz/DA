const jwt = require('jsonwebtoken');
const Account = require('../models/Account');
const mongoose = require('mongoose');

const normalizeId = (value) => String(value || '').trim();

/**
 * Middleware xác thực người dùng qua JWT Token.
 * Hỗ trợ Tương thích ngược (Legacy Support) cho phép dùng admin_id/userId nếu không có token.
 */
const protect = async (req, res, next) => {
    let token;
    const isMessagesRoute = String(req.originalUrl || '').startsWith('/api/messages');

    // 1. Kiểm tra Token trong Header Authorization
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } 
    // 2. Kiểm tra Token trong Cookies (nếu dùng cookie-parser)
    else if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    // TRƯỜNG HỢP CÓ TOKEN: Xác thực JWT
    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Tìm user và gắn vào request
            req.user = await Account.findById(decoded.accountId).select('-password_hash');
            
            if (!req.user) {
                return res.status(401).json({ status: 'fail', message: 'Người dùng sở hữu token này không còn tồn tại!' });
            }

            // For message routes, prefer explicit userId when provided to avoid
            // token/localStorage drift causing sender/recipient misclassification.
            const explicitMessageUserId = normalizeId(req.body?.userId || req.query?.userId);
            if (isMessagesRoute && explicitMessageUserId && mongoose.Types.ObjectId.isValid(explicitMessageUserId)) {
                if (String(req.user._id) !== explicitMessageUserId) {
                    const explicitUser = await Account.findById(explicitMessageUserId).select('-password_hash');
                    if (explicitUser) {
                        req.user = explicitUser;
                    }
                }
            }

            return next();
        } catch (error) {
            console.error('JWT Error:', error.message);
            // Thay vì trả về 401 luôn, ta sẽ để nó rơi xuống phần Legacy Support bên dưới
            // return res.status(401).json({ status: 'fail', message: 'Token không hợp lệ hoặc đã hết hạn!' });
        }
    }

    // TRƯỜNG HỢP KHÔNG CÓ TOKEN: Hỗ trợ tương thích ngược (Legacy Support)
    // Chấp nhận admin_id hoặc userId từ body/query/params (Cảnh báo: Cách này không bảo mật)
    const legacyId =
        req.body?.admin_id ||
        req.query?.admin_id ||
        req.body?.userId ||
        req.query?.userId ||
        (isMessagesRoute ? null : req.params?.userId);
    
    if (legacyId) {
        console.warn(`[AUTH] ⚠️ Legacy access attempt with ID: ${legacyId} at ${req.originalUrl}`);
        
        try {
            if (mongoose.Types.ObjectId.isValid(legacyId)) {
                const user = await Account.findById(legacyId).select('-password_hash');
                if (user) {
                    req.user = user;
                    return next();
                }
            } else {
                console.warn(`[AUTH] ❌ Legacy ID invalid format: ${legacyId}`);
            }
        } catch (err) {
            console.error(`[AUTH] 🚨 Error looking up legacy user: ${err.message}`);
        }
    }

    return res.status(401).json({ 
        status: 'fail', 
        message: 'Bạn chưa đăng nhập! Vui lòng gửi Token Authorization hoặc Admin ID hợp lệ để truy cập.' 
    });
};

module.exports = { protect };
