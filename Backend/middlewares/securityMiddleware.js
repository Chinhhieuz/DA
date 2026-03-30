const rateLimit = require('express-rate-limit');

// Giới hạn chung cho tất cả các yêu cầu
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 1000, // Tăng giới hạn lên 1000 để tránh lỗi 429 khi load trang nhiều dữ liệu
  message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau 15 phút.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Giới hạn cho đăng nhập và đăng ký
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Giảm xuống 15 phút cho đồng bộ
  max: 50, // Tăng lên 50 lần thử
  message: 'Quá nhiều nỗ lực đăng nhập từ IP này, vui lòng thử lại sau 15 phút.',
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  generalLimiter,
  authLimiter
};
