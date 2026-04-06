// Error Monitoring
process.on('uncaughtException', err => console.log('[CRIT] UNCAUGHT EXCEPTION:', err));
process.on('unhandledRejection', err => console.log('[CRIT] UNHANDLED REJECTION:', err));

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
// const mongoSanitize = require('express-mongo-sanitize');
// const xss = require('xss-clean');
// const hpp = require('hpp');
const { generalLimiter, authLimiter } = require('./middlewares/securityMiddleware');

// Nhập các file Routes
const authRoutes = require('./routes/authRoutes');
const postingRoutes = require('./routes/postingRoutes');
const commentRoutes = require('./routes/commentRoutes');
const threadRoutes = require('./routes/threadRoutes');
const reportRoutes = require('./routes/reportRoutes');
const communityRoutes = require('./routes/communityRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const adminRoutes = require('./routes/adminRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const path = require('path');
const http = require('http');
const socketModule = require('./socket');

const app = express();
app.set('trust proxy', 1); // Cần thiết khi chạy sau proxy như Render, Vercel
const server = http.createServer(app);

// Khởi tạo Socket.io tích hợp với HTTP Server
socketModule.init(server);

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

// 4. Chống tấn công NoSQL Injection
// app.use(mongoSanitize());

// 5. Chống tấn công XSS
// app.use(xss());

// 6. Chống tấn công HTTP Parameter Pollution
// app.use(hpp());

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

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
app.use('/api/admin', adminRoutes);
app.use('/api/feedback', feedbackRoutes);

// Global Error Handler — luôn trả về JSON, không bao giờ trả về HTML
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    console.error('[GLOBAL ERROR]', err.message || err);
    if (res.headersSent) return next(err);
    return res.status(err.status || 500).json({
        status: 'error',
        message: err.message || 'Lỗi máy chủ nội bộ'
    });
});

// Khởi động Server tích hợp cả Socket lẫn Express API
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`🚀 Server Backend & Socket.IO đang chạy tại http://localhost:${PORT}`);
});