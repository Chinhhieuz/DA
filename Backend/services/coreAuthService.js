const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Account = require('../models/Account'); 
const User = require('../models/User'); 

/**
 * Đăng nhập người dùng
 */
const loginUser = async (email, password) => {
    const account = await Account.findOne({ 
        $or: [
            { email: email },
            { username: email }
        ]
    });
    if (!account) {
        throw new Error('Tài khoản hoặc Email không tồn tại!');
    }

    let isMatch = false;
    if (password === account.password_hash) {
        isMatch = true; 
    } else {
        isMatch = await bcrypt.compare(password, account.password_hash);
    }
    
    if (!isMatch) {
        throw new Error('Sai mật khẩu!');
    }

    // Kiểm tra khóa tài khoản
    if (account.is_locked) {
        if (account.lock_until && account.lock_until < new Date()) {
            account.is_locked = false;
            account.lock_until = undefined;
            account.lock_reason = undefined;
            await account.save();
        } else {
            const reason = account.lock_reason || "Vi phạm quy tắc cộng đồng";
            const until = account.lock_until ? ` đến ${account.lock_until.toLocaleString('vi-VN')}` : " vĩnh viễn";
            throw new Error(`Tài khoản của bạn đang bị khóa${until}. Lý do: ${reason}. Vui lòng liên hệ Admin để khiếu nại.`);
        }
    }
    const token = jwt.sign(
        { accountId: account._id, role: account.role },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
    );

    let profile = null;
    if (account.role === 'user') {
        profile = await User.findOne({ account_id: account._id });
    }

    return {
        token,
        account: {
            id: account._id,
            email: account.email,
            username: account.username,
            full_name: account.full_name,
            avatar_url: account.avatar_url,
            bio: account.bio,
            location: account.location,
            website: account.website,
            role: account.role,
            preferences: account.preferences || { darkMode: false, pushNotifications: true, commentNotifications: true }
        },
        profile
    };
};

/**
 * Đăng ký người dùng
 */
const registerUser = async (userData) => {
    const { username, email, password, role, full_name, mssv, avatar_url } = userData;

    const existingAccount = await Account.findOne({
        $or: [
            { email: email },
            { username: username }
        ]
    });
    if (existingAccount) {
        throw new Error('Tài khoản hoặc Email đã tồn tại!');
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAccount = new Account({
        username,
        email,
        password_hash: hashedPassword,
        role: role || 'User',
        full_name: full_name || '',
        mssv: mssv || '',
        avatar_url: avatar_url || ''
    });

    await newAccount.save();
    
    return {
        id: newAccount._id,
        username: newAccount.username,
        email: newAccount.email,
        role: newAccount.role
    };
};

/**
 * Tạo token khôi phục mật khẩu
 */
const generateResetPasswordToken = async (email) => {
    const account = await Account.findOne({
        $or: [
            { email: email },
            { username: email }
        ]
    });
    if (!account) {
        throw new Error('Tài khoản hoặc Email không tồn tại trong hệ thống!');
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    account.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    account.resetPasswordExpires = Date.now() + 3600000;

    await account.save();

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/?view=reset-password&token=${resetToken}`;

    try {
        const brevoApiKey = process.env.BREVO_API_KEY;
        const emailUser = process.env.EMAIL_USER;

        if (!brevoApiKey) throw new Error('Thiếu BREVO_API_KEY');
        if (!emailUser) throw new Error('Thiếu EMAIL_USER');

        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                sender: { name: 'Hỗ trợ Kỹ thuật DA', email: emailUser },
                to: [{ email: account.email }],
                subject: `Khôi phục mật khẩu - Hệ thống DA`,
                htmlContent: `
                    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;">
                        <h2 style="color: #dc2626; text-align: center;">Khôi phục mật khẩu</h2>
                        <p>Chào bạn,</p>
                        <p>Nhấn vào nút bên dưới để đặt lại mật khẩu (Liên kết hết hạn trong 60 phút):</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetUrl}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Đổi mật khẩu ngay</a>
                        </div>
                        <p style="word-break: break-all; color: #0066cc;">${resetUrl}</p>
                    </div>
                `
            })
        });

        if (!response.ok) throw new Error('Lỗi gửi mail qua Brevo API');
        return { message: 'Thành công! Kiểm tra hộp thư của bạn.' };
    } catch (error) {
        account.resetPasswordToken = undefined;
        account.resetPasswordExpires = undefined;
        await account.save();
        throw new Error(`Dịch vụ gửi Mail báo lỗi: ${error.message}`);
    }
};

/**
 * Đặt lại mật khẩu bằng token
 */
const resetPassword = async (token, newPassword) => {
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    const account = await Account.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
    });

    if (!account) throw new Error('Token không hợp lệ hoặc đã hết hạn.');

    const salt = await bcrypt.genSalt(10);
    account.password_hash = await bcrypt.hash(newPassword, salt);
    account.resetPasswordToken = undefined;
    account.resetPasswordExpires = undefined;
    await account.save();

    return { message: 'Đổi mật khẩu thành công!' };
};

/**
 * Đổi mật khẩu trong phần cài đặt
 */
const changePasswordAuth = async (accountId, oldPassword, newPassword) => {
    const account = await Account.findById(accountId);
    if (!account) throw new Error('Tài khoản không tồn tại!');

    let isMatch = (oldPassword === account.password_hash) || await bcrypt.compare(oldPassword, account.password_hash);
    if (!isMatch) throw new Error('Mật khẩu cũ không chính xác!');

    const salt = await bcrypt.genSalt(10);
    account.password_hash = await bcrypt.hash(newPassword, salt);
    await account.save();

    return { message: 'Đổi mật khẩu thành công!' };
};

module.exports = {
    loginUser,
    registerUser,
    generateResetPasswordToken,
    resetPassword,
    changePasswordAuth
};
