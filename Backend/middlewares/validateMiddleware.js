const { body, validationResult } = require('express-validator');

/**
 * Middleware để kiểm tra kết quả validation
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (errors.isEmpty()) {
        return next();
    }
    
    // Nếu có lỗi, trả về lỗi đầu tiên cho Frontend dễ xử lý
    return res.status(400).json({
        status: 'fail',
        message: errors.array()[0].msg,
        errors: errors.array()
    });
};

/**
 * Quy tắc kiểm tra cho Đăng ký (Register)
 */
const registerValidation = [
    body('username')
        .trim()
        .notEmpty().withMessage('Tên đăng nhập không được để trống')
        .isLength({ min: 3 }).withMessage('Tên đăng nhập phải có ít nhất 3 ký tự'),
    body('email')
        .isEmail().withMessage('Email không hợp lệ')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 }).withMessage('Mật khẩu phải có ít nhất 6 ký tự'),
    validate
];

/**
 * Quy tắc kiểm tra cho Đăng nhập (Login)
 */
const loginValidation = [
    body('email').notEmpty().withMessage('Vui lòng cung cấp email hoặc username'),
    body('password').notEmpty().withMessage('Vui lòng cung cấp mật khẩu'),
    validate
];

/**
 * Quy tắc kiểm tra cho Tạo bài viết (Create Post)
 */
const postValidation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Tiêu đề bài viết không được để trống')
        .isLength({ max: 200 }).withMessage('Tiêu đề không được quá 200 ký tự'),
    body('content')
        .trim()
        .notEmpty().withMessage('Nội dung bài viết không được để trống'),
    validate
];

module.exports = {
    registerValidation,
    loginValidation,
    postValidation
};
