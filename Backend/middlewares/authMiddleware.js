const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Account = require('../models/Account');

const normalizeId = (value) => String(value || '').trim();
const allowLegacyAuth = String(
    process.env.ALLOW_LEGACY_AUTH || (process.env.NODE_ENV === 'development' ? 'true' : 'false')
).toLowerCase() === 'true';

const protect = async (req, res, next) => {
    let token = '';
    const isMessagesRoute = String(req.originalUrl || '').startsWith('/api/messages');

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.jwt) {
        token = req.cookies.jwt;
    }

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const account = await Account.findById(decoded.accountId).select('-password_hash');
            if (!account) {
                return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
            }

            req.user = account;

            // Backward compatibility for current messaging client while token/user drift exists.
            const explicitMessageUserId = normalizeId(req.body?.userId || req.query?.userId);
            if (isMessagesRoute && explicitMessageUserId && mongoose.Types.ObjectId.isValid(explicitMessageUserId)) {
                if (String(req.user._id) !== explicitMessageUserId) {
                    const explicitUser = await Account.findById(explicitMessageUserId).select('-password_hash');
                    if (explicitUser) req.user = explicitUser;
                }
            }

            return next();
        } catch (error) {
            // Continue to legacy flow only when explicitly enabled.
        }
    }

    if (!allowLegacyAuth) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
    }

    const legacyId =
        req.body?.admin_id ||
        req.query?.admin_id ||
        req.body?.userId ||
        req.query?.userId ||
        (isMessagesRoute ? null : req.params?.userId);

    if (legacyId && mongoose.Types.ObjectId.isValid(legacyId)) {
        const account = await Account.findById(legacyId).select('-password_hash');
        if (account) {
            req.user = account;
            return next();
        }
    }

    return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
};

module.exports = { protect };
