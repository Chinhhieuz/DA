/**
 * File test này mô phỏng luồng Đăng Bình Luận của người dùng (User) 
 * từ frontend gọi lên backend bằng hàm native `fetch`.
 * Chạy bằng lệnh: node testComment.js trong thư mục Backend
 */

async function testCreateCommentFlow() {
    console.log('=== 🚀 BẮT ĐẦU TEST LUỒNG POST COMMENT ===\n');
    
    try {
        console.log('1. [TEST] Đăng nhập bằng tài khoản mẫu để lấy ID của Author...');
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

        console.log('\n2. [TEST] Khởi tạo một bài viết tạm thời để có thứ tương tác (bình luận) vào...');
        const postRes = await fetch('http://localhost:5000/api/posts/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                author_id: authorId,
                title: 'Bài viết chờ Bình Luận 💬',
                content: 'Tôi đang cần 1 vài ý kiến phản hồi về tấm ảnh thiên nhiên này.',
                community: 'Hỏi đáp'
            })
        });

        const postResult = await postRes.json();
        if (postResult.status !== 'success') {
            console.error('❌ [TEST] Không tạo được bài viết mới để test comment:', postResult.message);
            return;
        }

        const postId = postResult.data._id;
        console.log(`✅ [TEST] Đã tạo Bài viết mồi câu thành công! Post ID: ${postId}`);

        console.log('\n3. [TEST] Bắt đầu gọi API gửi Bình luận (commentController)...');
        // Tạo POST request giả lập gửi bình luận CÓ ẢNH đính kèm
        const commentPayload = {
            post_id: postId,
            author_id: authorId,
            content: 'Tôi thấy tấm ảnh rất đẹp và phong cảnh tuyệt vời. Tuyệt đỉnh! 👏',
            image_url: 'https://images.unsplash.com/photo-1544383835-bda2bc66a55d' // Ảnh test đính kèm vào comment
        };

        const commentRes = await fetch('http://localhost:5000/api/comments/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(commentPayload)
        });

        const commentResult = await commentRes.json();
        
        if (commentResult.status === 'success') {
            console.log('\n✅ [TEST] Gửi bình luận THÀNH CÔNG! Dưới đây là thông tin JSON trả về:');
            console.dir(commentResult.data, { depth: null, colors: true });
            
            console.log('\n🌟 Hãy kiểm tra cửa sổ Terminal đang chạy "node app.js" để xem các log của commentController nhé!');
        } else {
            console.error('\n❌ [TEST] Lỗi khi đăng bình luận:', commentResult.message);
        }

    } catch (err) {
        console.error('🚨 [TEST] Lỗi hệ thống trong lúc chạy test:', err.message);
    }
}

testCreateCommentFlow();
