/**
 * File test kịch bản Báo Cáo Vi Phạm (Report):
 * 1. Đăng nhập 1 User thường (Người tố cáo) để lấy ID -> Tạo 1 Bài Post rác rưởi.
 * 2. Cùng User đó Tạo Tố Cáo về chính bài viết đó (Hoặc 1 user khác).
 * 3. Tạo/Đăng nhập 1 Admin.
 * 4. Admin nhảy vào đọc Tố Cáo -> Xử lý Cảnh cáo (warn_user) hoặc Xoá Post (delete_post).
 * 
 * Chạy bằng lệnh: node testReport.js
 */

async function testReportFlow() {
    console.log('=== 🚀 BẮT ĐẦU TEST LUỒNG REPORT (TỐ CÁO VI PHẠM) ===\n');
    
    try {
        console.log('1. [TEST] Tạo 1 tài khoản Admin bằng API Register (nếu chưa có Admin nào test được)...');
        // Bước này giúp đảm bảo lúc nào test cũng có 1 ông Admin đứng ra giải quyết
        const adminPayload = {
            username: 'admin_test_bot',
            email: 'admin_bot' + Date.now() + '@dntu.edu.vn', // Email động để k bị trùng
            password: 'AdminPassword123!',
            role: 'Admin' // <--- Rất quan trọng
        };
        const registerRes = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(adminPayload)
        });
        const registerData = await registerRes.json();
        const adminId = registerData.data.id;
        console.log(`✅ [TEST] Admin hợp lệ đã ra sân sẵn sàng! Admin ID: ${adminId}`);

        console.log('\n2. [TEST] Đăng nhập User thường để lấy ID...');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: '1721021202@dntu.edu.vn', password: 'Chinhhieu01@' })
        });
        const loginData = await loginRes.json();
        const normalUserId = loginData.data.user.id;
        console.log(`✅ [TEST] User thường đã đăng nhập. User ID: ${normalUserId}`);

        console.log('\n3. [TEST] User thường này lỡ tay đăng 1 Bài Viết Nhạy Cảm...');
        const postRes = await fetch('http://localhost:5000/api/posts/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                author_id: normalUserId,
                title: 'Link trúng thưởng nhận 100 tỷ',
                content: 'Các bạn click vào link này để tải mã độc nhé: www.virus.com',
                community: 'Chung'
            })
        });
        const postResult = await postRes.json();
        const badPostId = postResult.data._id;
        console.log(`✅ [TEST] Bài viết đã đăng lên mạng thành công! Post ID: ${badPostId}`);

        console.log('\n4. [TEST] Gọi API gửi Tố Cáo cho bài viết trên...');
        const reportRes = await fetch('http://localhost:5000/api/reports/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                post_id: badPostId,
                reporter_id: normalUserId, // Tự đăng tự report luôn cho nhanh 
                reason: 'Phát tán link độc hại, đe dọa an toàn thông tin!'
            })
        });
        const reportResult = await reportRes.json();
        const reportId = reportResult.data._id;
        console.log(`✅ [TEST] Đã đệ trình đơn Tố Cáo cho Admin duyệt. Report ID: ${reportId}`);

        console.log('\n5. [TEST] Admin nhận được Đơn -> Quyết định CẢNH CÁO Tác Giả (Testing warn_user)...');
        const handleWarnRes = await fetch('http://localhost:5000/api/reports/handle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_id: adminId, // Đưa ID Admin vô để xác thực
                report_id: reportId,
                action: 'warn_user'
            })
        });
        const warnResult = await handleWarnRes.json();
        console.log('✅ [TEST] Kết quả từ Admin:', warnResult.message);


        console.log('\n6. [TEST] Thử nghiệm sức mạnh TỐI THƯỢNG: Admin TẬN DIỆT BÀI VIẾT (Testing delete_post)...');
        // Phải tạo 1 report khác vì cái trước đã "resolved" rồi. Hoặc tạo 1 post khác rồi report.
        console.log('...Tự động tạo Post và Report 2 siêu tốc...');
        const postRes2 = await (await fetch('http://localhost:5000/api/posts/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author_id: normalUserId, title: 'Bài rác', content: 'Cần bị xoá' }) })).json();
        const reportRes2 = await (await fetch('http://localhost:5000/api/reports/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post_id: postRes2.data._id, reporter_id: normalUserId, reason: 'Rác' }) })).json();
        
        const handleDelRes = await fetch('http://localhost:5000/api/reports/handle', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_id: adminId,
                report_id: reportRes2.data._id,
                action: 'delete_post' // 🔥 Ra lệnh xoá
            })
        });
        const delResult = await handleDelRes.json();
        console.log('✅ [TEST] Kết quả từ Admin Xử trảm:', delResult.message);

        console.log('\n🌟 Hãy kiểm tra cửa sổ Terminal đang chạy "node app.js" để cảm nhận Logic Xử Lý Vi Phạm của hệ thống nhé!');

    } catch (err) {
        console.error('🚨 [TEST] Lỗi hệ thống trong lúc chạy test:', err.message);
    }
}

testReportFlow();
