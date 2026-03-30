/**
 * Test script for delete comment functionality
 */
async function testDeleteComment() {
    console.log('=== 🚀 BẮT ĐẦU TEST DELETE COMMENT ===\n');
    
    try {
        const timestamp = Date.now();
        const testUser = {
            username: `testuser_${timestamp}`,
            email: `test_${timestamp}@example.com`,
            password: 'Password123!'
        };

        console.log('1. [TEST] Đăng ký người dùng mới...');
        const regRes = await fetch('http://localhost:5000/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(testUser)
        });
        const regData = await regRes.json();
        
        if (regData.status !== 'success') {
            console.error('❌ [TEST] Đăng ký thất bại:', regData.message);
            return;
        }

        console.log('2. [TEST] Đăng nhập...');
        const loginRes = await fetch('http://localhost:5000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: testUser.email, password: testUser.password })
        });
        const loginData = await loginRes.json();
        
        if (loginData.status !== 'success') {
            console.error('❌ [TEST] Đăng nhập thất bại:', loginData.message);
            return;
        }

        const authorId = loginData.data.user.id;

        console.log('2. [TEST] Tạo bài viết...');
        const postRes = await fetch('http://localhost:5000/api/posts/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                author_id: authorId,
                title: 'Post to test delete',
                content: 'Content',
                community: 'Test'
            })
        });
        const postData = await postRes.json();
        const postId = postData.data._id;

        console.log('3. [TEST] Tạo bình luận...');
        const commentRes = await fetch('http://localhost:5000/api/comments/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                post_id: postId,
                author_id: authorId,
                content: 'Comment to be deleted'
            })
        });
        const commentData = await commentRes.json();
        const commentId = commentData.data._id;

        console.log('4. [TEST] Xóa bình luận...');
        const deleteRes = await fetch(`http://localhost:5000/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: authorId })
        });
        const deleteData = await deleteRes.json();
        
        if (deleteData.status === 'success') {
            console.log('✅ [TEST] Xóa bình luận thành công!');
        } else {
            console.error('❌ [TEST] Xóa bình luận thất bại:', deleteData.message);
        }

    } catch (err) {
        console.error('🚨 [TEST] Lỗi:', err.message);
    }
}

testDeleteComment();
