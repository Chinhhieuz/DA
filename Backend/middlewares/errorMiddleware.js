const globalErrorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            stack: err.stack,
            error: err
        });
    }

    const isServerError = err.statusCode >= 500;
    const safeMessage = isServerError
        ? 'Internal server error'
        : (err.message || 'Request failed');

    return res.status(err.statusCode).json({
        status: err.status,
        message: safeMessage
    });
};

const notFoundHandler = (req, res, next) => {
    const error = new Error('Endpoint not found');
    error.statusCode = 404;
    next(error);
};

module.exports = {
    globalErrorHandler,
    notFoundHandler
};
