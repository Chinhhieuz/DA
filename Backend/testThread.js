/**
 * File test này mô phỏng luồng Đăng Thread (Bài viết -> Comment -> Author tự Reply)
 * Chạy bằng lệnh: node testThread.js trong thư mục Backend
 */

async function testCreateThreadFlow() {
    console.log('=== 🚀 BẮT ĐẦU TEST LUỒNG POST THREAD (REPLY COMMENT) ===\n');
    
    try {
        console.log('1. [TEST] Đăng nhập bằng tài khoản mẫu để lấy ID của Tác giả (Author)...');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: '1721021202@dntu.edu.vn', password: 'Chinhhieu01@' })
        });
        
        const loginData = await loginRes.json();
        if (loginData.status !== 'success') {
            console.error('❌ [TEST] Đăng nhập thất bại. Không lấy được ID User. Hãy chạy server ("node app.js") trước!');
            return;
        }

        const authorId = loginData.data.user.id;
        console.log(`✅ [TEST] Đăng nhập thành công! Đã lấy được User ID: ${authorId}`);

        console.log('\n2. [TEST] Khởi tạo Bài Việt để Tác giả làm chủ trì...');
        const postRes = await fetch('http://localhost:5000/api/posts/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                author_id: authorId,
                title: 'Khoe góc làm việc 💻',
                content: 'Mọi người cho mình xin tí ý kiến về Setup góc PC này nhé.',
                community: 'Chung'
            })
        });

        const postResult = await postRes.json();
        const postId = postResult.data._id;
        console.log(`✅ [TEST] Đã tạo Bài viết gốc! Post ID: ${postId}`);

        console.log('\n3. [TEST] Khởi tạo Comment - Đóng vai Khán Giả tọc mạch...');
        const commentRes = await fetch('http://localhost:5000/api/comments/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                post_id: postId,
                author_id: authorId, // Đáng ra là người khác, chạy test tạm bằng ID của chính mình luôn (vẫn cho phép)
                content: 'Góc làm việc nhìn hơi tối, bồ tèo sắm bóng đèn màu đỏ rực lửa nhé🔥'
            })
        });

        const commentResult = await commentRes.json();
        const commentId = commentResult.data._id;
        console.log(`✅ [TEST] Khán giả đã Comment. Comment ID: ${commentId}`);

        console.log('\n4. [TEST] Bắt đầu gọi API gửi Thread Reply (Tác vụ then chốt từ threadController)...');
        // Tạo POST request giả lập việc TÁC GIẢ BÀI VIẾT reply và chèn hình ảnh minh hoạ bóng đèn
        const threadPayload = {
            comment_id: commentId,
            author_id: authorId, // CHUẨN - authorId này trùng khớp với Tác Giả của Bài Post số 2
            content: 'Cảm ơn góp ý nha hihi! Mình đã mua chiếc đèn LED đỏ này rồi.',
            image_url: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d'
        };

        const threadRes = await fetch('http://localhost:5000/api/threads/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(threadPayload)
        });

        const threadResult = await threadRes.json();
        
        if (threadResult.status === 'success') {
            console.log('\n✅ [TEST] Gửi Thread phản hồi THÀNH CÔNG! Dưới đây là thông tin JSON trả về:');
            console.dir(threadResult.data, { depth: null, colors: true });
            
            console.log('\n🌟 Hãy kiểm tra cửa sổ Terminal đang chạy "node app.js" để xem các log của threadController nhé!');
        } else {
            console.error('\n❌ [TEST] Lỗi khi tạo thread:', threadResult.message);
        }

    } catch (err) {
        console.error('🚨 [TEST] Lỗi hệ thống trong lúc chạy test:', err.message);
    }
}

testCreateThreadFlow();
