/**
 * File test này mô phỏng luồng đăng bài của người dùng (User) 
 * từ frontend gọi lên backend bằng hàm native `fetch`.
 * Chạy bằng lệnh: node testPosting.js trong thư mục Backend
 */

async function testCreatePostFlow() {
    console.log('=== 🚀 BẮT ĐẦU TEST LUỒNG POSTING ===\n');
    
    try {
        console.log('1. [TEST] Đăng nhập bằng tài khoản mẫu để lấy ID của Author...');
        // Đăng nhập bằng hàm auth mà mình đã fix trước đó
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

        console.log('\n2. [TEST] Bắt đầu gọi hàm tạo Bài viết với Controller (postingController)...');
        // Tạo POST request giả lập gửi bài viết CÓ ẢNH
        const postPayload = {
            author_id: authorId,
            title: 'Khơi nguồn đam mê Lập Trình',
            content: 'Xin chào mọi người! Cùng chia sẻ kinh nghiệm tự học lập trình ở bình luận bên dưới nhé.',
            community: 'Lập trình',
            image_url: 'https://images.unsplash.com/photo-1623715537851-8bc15aa8c145' // Ảnh đính kèm
        };

        const postRes = await fetch('http://localhost:5000/api/posts/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(postPayload)
        });

        const postResult = await postRes.json();
        
        if (postResult.status === 'success') {
            console.log('\n✅ [TEST] Đăng bài THÀNH CÔNG! Dưới đây là thông tin trả về:');
            console.dir(postResult.data, { depth: null, colors: true });
            
            console.log('\n🌟 Hãy kiểm tra cửa sổ Terminal đang chạy "node app.js" để xem các log của postingController nhé!');
        } else {
            console.error('\n❌ [TEST] Lỗi khi đăng bài:', postResult.message);
        }

    } catch (err) {
        console.error('🚨 [TEST] Lỗi hệ thống trong lúc chạy test:', err.message);
    }
}

testCreatePostFlow();
