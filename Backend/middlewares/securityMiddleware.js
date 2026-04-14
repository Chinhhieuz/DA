// TẠM THỜI: Tắt rate limiter để chẩn đoán lỗi treo request với Express 5
// express-rate-limit v8 có thể không tương thích với Express 5
const passThrough = (req, res, next) => {
  console.log('[SEC] Limiter Pass-through');
  next();
};

const generalLimiter = passThrough;
const authLimiter = passThrough;

module.exports = {
  generalLimiter,
  authLimiter
};
