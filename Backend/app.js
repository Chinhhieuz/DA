// Error Monitoring
process.on('uncaughtException', err => console.log('[CRIT] UNCAUGHT EXCEPTION:', err));
process.on('unhandledRejection', err => console.log('[CRIT] UNHANDLED REJECTION:', err));

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { generalLimiter, authLimiter } = require('./middlewares/securityMiddleware');
const { globalErrorHandler, notFoundHandler } = require('./middlewares/errorMiddleware');

// Chống NoSQL Injection: Loại ký tự $ và . khỏi req.body và req.params
const noSqlSanitizer = (req, res, next) => {
    const sanitize = (obj) => {
        if (obj && typeof obj === 'object') {
            Object.keys(obj).forEach(key => {
                const val = obj[key];
                // 1. Nếu key chứa ký tự nguy hiểm ($ hoặc .)
                if (key.includes('.') || key.startsWith('$')) {
                    const cleanKey = key.replace(/\$|\./g, '');
                    delete obj[key];
                    obj[cleanKey] = val;
                }
                // 2. Tiếp tục đệ quy nếu giá trị là object (nhưng KHÔNG làm sạch chuỗi giá trị)
                if (val && typeof val === 'object') {
                    sanitize(val);
                }
            });
        }
    };
    if (req.body) sanitize(req.body);
    if (req.params) sanitize(req.params);
    if (req.query) sanitize(req.query);
    next();
};

// Chống XSS: Encode HTML entities trong req.body
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


// Nhập các file Routes
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
const path = require('path');
const http = require('http');
const socketModule = require('./socket');

const app = express();
app.set('trust proxy', 1); // Cần thiết khi chạy sau proxy như Render, Vercel

// Đảm bảo req có đủ properties cơ bản
app.use((req, res, next) => {
    if (!req.body) req.body = {};
    if (!req.params) req.params = {};
    next();
});

const server = http.createServer(app);

// socketModule.init(server) đã được di chuyển xuống dưới

// Middleware xử lý Cookie
app.use(cookieParser());

// Body Parsers (Phải đứng TRƯỚC các middleware xử lý dữ liệu)
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// --- Middlewares đã được di chuyển lên trên để đảm bảo thứ tự ---

// Phục vụ các file tĩnh trong thư mục uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Cấu hình Middleware Bảo mật
// 1. Helmet giúp thiết lập các HTTP headers bảo mật
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false, // Tắt CSP cho API JSON hoặc tự cấu hình nếu cần
}));

// 2. Cấu hình CORS (Hỗ trợ nhiều nguồn)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    // Cho phép các yêu cầu không có origin (như mobile apps hoặc curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.some(o => o.replace(/\/$/, '') === origin.replace(/\/$/, ''))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};
app.use(cors(corsOptions));

// 3. Giới hạn số lượng yêu cầu (Rate Limiting)
app.use('/api', generalLimiter); // Áp dụng cho tất cả route bắt đầu bằng /api
app.use('/api/auth/login', authLimiter); // Áp dụng chặt chẽ hơn cho login
app.use('/api/auth/register', authLimiter); // Áp dụng chặt chẽ hơn cho register

// 4. Chống NoSQL Injection (custom - tương thích Express 5)
app.use(noSqlSanitizer);

// 5. Chống XSS trên req.body (custom - tương thích Express 5)
app.use(xssSanitizer);

// 6. HPP tạm tắt (không tương thích Express 5 - req.query getter-only)
// try { const hpp = require('hpp'); app.use(hpp()); } catch(e) { console.warn('[APP] hpp skipped:', e.message); }

// --- Middlewares đã được di chuyển lên trên để đảm bảo thứ tự ---

// Kết nối Database
mongoose.connect(process.env.MONGODB_URI, { family: 4 })
  .then(() => console.log('✅ Đã kết nối MongoDB Atlas thành công!'))
  .catch((err) => console.log('❌ Lỗi kết nối DB:', err));

// ==========================================
// Gắn (Mount) các Routes vào ứng dụng
// Tất cả các route trong authRoutes sẽ có tiền tố là /api/auth
// Tất cả bài viết sẽ có tiền tố là /api/posts
// Tất cả bình luận sẽ có tiền tố là /api/comments
// Tất cả phản hồi sẽ có tiền tố là /api/threads
// Tất cả tố cáo sẽ có tiền tố là /api/reports
// ==========================================
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

// --- XỬ LÝ LỖI (Error Handling) ---
// Xử lý Route không tồn tại (404)
app.use(notFoundHandler);

// Xử lý lỗi toàn cục (500, Custom Errors)
app.use(globalErrorHandler);


// Khởi tạo Socket.io tích hợp với HTTP Server
socketModule.init(server);

// Khởi động Server tích hợp cả Socket lẫn Express API
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server Backend & Socket.IO đang chạy tại http://localhost:${PORT}`);
});