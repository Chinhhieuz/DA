const jwt = require('jsonwebtoken');
const Account = require('../models/Account');

// Read token from standard places used by this project.
const extractTokenFromRequest = (req) => {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        return req.headers.authorization.split(' ')[1];
    }
    if (req.cookies && req.cookies.jwt) {
        return req.cookies.jwt;
    }
    return '';
};

const decodeTokenClaims = (token) => {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const accountId = String(decoded?.accountId || decoded?.id || '').trim();
    if (!accountId) return null;

    return {
        _id: accountId,
        role: decoded?.role || 'User'
    };
};

// Decode token and hydrate full account object for downstream handlers.
const resolveAccountFromToken = async (token) => {
    if (!token) return null;
    const claims = decodeTokenClaims(token);
    if (!claims?._id) return null;

    const account = await Account.findById(claims._id).select('-password_hash');
    return account || null;
};

// Strict auth: request must have a valid token.
const protect = async (req, res, next) => {
    const token = extractTokenFromRequest(req);
    if (!token) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
    }

    try {
        const account = await resolveAccountFromToken(token);
        if (!account) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        req.user = account;
        return next();
    } catch (error) {
        return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
    }
};

// Optional auth: if token exists and is valid, attach req.user; otherwise continue as guest.
const optionalProtect = async (req, res, next) => {
    const token = extractTokenFromRequest(req);
    if (!token) return next();

    try {
        // Fast path for public/optional routes: avoid DB lookup on every request.
        // Most optional routes only need req.user._id to personalize response.
        const claims = decodeTokenClaims(token);
        if (claims?._id) req.user = claims;
    } catch (error) {
        // Ignore invalid token in optional mode and continue as public request.
    }

    return next();
};

module.exports = { protect, optionalProtect };
