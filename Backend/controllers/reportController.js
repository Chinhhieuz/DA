const reportService = require('../services/reportService');

const handleServiceError = (error, res) => {
    const message = String(error?.message || 'Unknown error');

    if (message.startsWith('NOT_FOUND:')) {
        return res.status(404).json({ status: 'fail', message: message.split(':')[1] });
    }
    if (message.startsWith('FORBIDDEN:')) {
        return res.status(403).json({ status: 'fail', message: message.split(':')[1] });
    }
    if (message.includes('Thieu') || message.includes('khong hop le') || message.includes('da duoc xu ly')) {
        return res.status(400).json({ status: 'fail', message });
    }

    console.error('[REPORT CONTROLLER] Error:', message);
    return res.status(500).json({ status: 'error', message: 'Server error: ' + message });
};

const createReport = async (req, res) => {
    try {
        const reporterId = String(req.user?._id || '').trim();
        if (!reporterId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const payload = {
            post_id: req.body?.post_id,
            reason: req.body?.reason,
            description: req.body?.description,
            evidence_images: req.body?.evidence_images,
            reporter_id: reporterId
        };

        const newReport = await reportService.createReportService(payload);
        return res.status(201).json({
            status: 'success',
            message: 'Da gui to cao cho Admin kiem duyet!',
            data: newReport
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const handleReport = async (req, res) => {
    try {
        const adminId = String(req.user?._id || '').trim();
        if (!adminId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }

        const payload = {
            admin_id: adminId,
            report_id: req.body?.report_id,
            action: req.body?.action
        };

        const report = await reportService.handleReportService(payload);
        return res.status(200).json({
            status: 'success',
            message: `Da xu ly thanh cong voi quyet dinh: ${payload.action}`,
            data: report
        });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

const getPendingReports = async (req, res) => {
    try {
        const adminId = req.user?._id ? String(req.user._id) : '';
        if (!adminId) {
            return res.status(401).json({ status: 'fail', message: 'Unauthorized' });
        }
        const reports = await reportService.getPendingReportsService(adminId);
        return res.status(200).json({ status: 'success', data: reports });
    } catch (error) {
        return handleServiceError(error, res);
    }
};

module.exports = { createReport, handleReport, getPendingReports };
