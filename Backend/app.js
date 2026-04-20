// Error monitoring
process.on('uncaughtException', (err) => console.log('[CRIT] UNCAUGHT EXCEPTION:', err));
process.on('unhandledRejection', (err) => console.log('[CRIT] UNHANDLED REJECTION:', err));

const path = require('path');
// Always load env from Backend/.env regardless of process cwd.
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const { connectToDatabase } = require('./config/db');
const { isAllowedOrigin } = require('./utils/originAllowlist');
const { scanShield, apiGuard, generalLimiter, authLimiter } = require('./middlewares/securityMiddleware');
const { globalErrorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');

// Remove dangerous MongoDB operators from incoming payload.
const noSqlSanitizer = (req, res, next) => {
    const sanitize = (obj) => {
        if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach((key) => {
                const value = obj[key];
                if (key.includes('.') || key.startsWith('$')) {
                    const cleanKey = key.replace(/\$|\./g, '');
                    delete obj[key];
                    obj[cleanKey] = value;
                }
                if (value && typeof value === 'object') sanitize(value);
            });
        }
    };

    if (req.body) sanitize(req.body);
    if (req.params) sanitize(req.params);
    if (req.query) sanitize(req.query);
    next();
};

// Escape potentially unsafe HTML in body strings.
const xssSanitizer = (req, res, next) => {
    const skipFields = ['password', 'oldPassword', 'newPassword', 'password_hash'];
    const escapeHtml = (str) => str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');

    const sanitize = (obj, keyName = '') => {
        if (skipFields.includes(keyName) || keyName.endsWith('_url') || keyName === 'avatar') return obj;
        if (typeof obj === 'string') return escapeHtml(obj);
        if (Array.isArray(obj)) return obj.map((item) => sanitize(item, keyName));
        if (obj && typeof obj === 'object') {
            const result = {};
            for (const key of Object.keys(obj)) result[key] = sanitize(obj[key], key);
            return result;
        }
        return obj;
    };

    if (req.body && typeof req.body === 'object') req.body = sanitize(req.body);
    next();
};

const authRoutes = require('./routes/authRoutes');
const postingRoutes = require('./routes/postingRoutes');
const commentRoutes = require('./routes/commentRoutes');
const threadRoutes = require('./routes/threadRoutes');
const reportRoutes = require('./routes/reportRoutes');
const communityRoutes = require('./routes/communityRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const messageRoutes = require('./routes/messageRoutes');
const adminRoutes = require('./routes/adminRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.set('etag', 'strong');

app.use(scanShield);

app.use((req, res, next) => {
    if (!req.body) req.body = {};
    if (!req.params) req.params = {};
    next();
});

app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(compression({ threshold: 1024 }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.get('/uploads/:file', (req, res, next) => {
    const rawFile = String(req.params?.file || '').trim();
    if (!rawFile) return next();

    // Prevent path traversal and only handle a single filename segment.
    const safeFile = path.basename(rawFile);
    if (!safeFile || safeFile !== rawFile) return next();

    const localPath = path.join(__dirname, 'uploads', safeFile);
    if (require('fs').existsSync(localPath)) {
        return res.sendFile(localPath);
    }

    // Legacy fallback: some records store Cloudinary public id as plain filename.
    const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME || '').trim();
    if (cloudName) {
        const encodedFile = encodeURIComponent(safeFile);
        return res.redirect(302, `https://res.cloudinary.com/${cloudName}/image/upload/${encodedFile}`);
    }

    return next();
});

app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false
}));

const corsOptions = {
    origin(origin, callback) {
        if (isAllowedOrigin(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    optionsSuccessStatus: 204
};

app.use(cors(corsOptions));
app.use('/api', apiGuard);

app.use('/api', generalLimiter);
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use(noSqlSanitizer);
app.use(xssSanitizer);

connectToDatabase()
    .then(() => console.log('[DB] Connected to MongoDB Atlas'))
    .catch((err) => console.log('[DB] Connection error:', err));

app.get('/api/healthz', (req, res) => {
    res.status(200).json({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/posts', postingRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/communities', communityRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

if (require.main === module) {
    const http = require('http');
    const socketModule = require('./socket');
    const server = http.createServer(app);

    socketModule.init(server);

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
        console.log(`[APP] Backend + Socket listening at http://localhost:${PORT}`);
    });
}

module.exports = app;
