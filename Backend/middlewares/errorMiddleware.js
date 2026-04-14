/**
 * Middleware xử lý lỗi (Centralized Error Handling)
 * Mọi lỗi ném ra từ Controller sẽ được định dạng đồng nhất tại đây.
 */
const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // 1. Phản hồi lỗi chi tiết khi ở môi trường DEV
    if (process.env.NODE_ENV === 'development') {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            stack: err.stack,
            error: err
        });
    }

    // 2. Phản hồi cơ bản khi ở môi trường PRODUCTION (Bảo mật hơn)
    return res.status(err.statusCode).json({
        status: err.status,
        message: err.message || 'Lỗi hệ thống nội bộ'
    });
};

/**
 * Middleware bắt các yêu cầu đến Route không tồn tại (404)
 */
const notFoundHandler = (req, res, next) => {
    const error = new Error(`Không tìm thấy endpoint: ${req.originalUrl}`);
    error.statusCode = 404;
    next(error);
};

module.exports = {
    globalErrorHandler,
    notFoundHandler
};
