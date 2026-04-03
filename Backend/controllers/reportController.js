const reportService = require('../services/reportService');

const handleServiceError = (error, res) => {
    if (error.message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message.startsWith('FORBIDDEN:')) {
        return res.status(403).json({ status: 'fail', message: error.message.split(':')[1] });
    }
    if (error.message === 'Vui lòng cung cấp đủ thông tin tố cáo!' || 
        error.message === 'Vui lòng cung cấp đủ thông tin xử lý!' ||
        error.message === 'Tố cáo này đã được xử lý rồi!' ||
        error.message.includes('Hành động không hợp lệ') ||
        error.message === 'Thiếu admin_id!') {
        return res.status(400).json({ status: 'fail', message: error.message });
    }
    
    console.error('[REPORT CONTROLLER] 🚨 Lỗi hệ thống:', error.message);
    return res.status(500).json({ status: 'error', message: 'Lỗi máy chủ: ' + error.message });
};

const createReport = async (req, res) => {
    try {
        const newReport = await reportService.createReportService(req.body);
        return res.status(201).json({ status: 'success', message: 'Đã gửi tố cáo cho Admin kiểm duyệt!', data: newReport });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const handleReport = async (req, res) => {
    try {
        const report = await reportService.handleReportService(req.body);
        return res.status(200).json({ status: 'success', message: `Đã xử lý thành công với quyết định: ${req.body.action}`, data: report });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getPendingReports = async (req, res) => {
    try {
        const reports = await reportService.getPendingReportsService(req.query.admin_id);
        return res.status(200).json({ status: 'success', data: reports });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

module.exports = { createReport, handleReport, getPendingReports };
