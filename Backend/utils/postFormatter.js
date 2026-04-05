const { getImageUrl } = require('./imageUrl');

const formatPostData = (post, commentCount, recentComments, userVote, isFollowing) => {
    let authorId;
    if (post.author) {
        authorId = post.author._id ? post.author._id.toString() : post.author.toString();
    }
    return {
        id: post._id.toString(),
        author: post.author ? {
            id: authorId,
            name: post.author.display_name || post.author.username || 'Unknown',
            avatar: getImageUrl(post.author.avatar_url),
            username: post.author.username || 'unknown',
            isFollowing
        } : null,
        community: post.community || 'lập trình',
        timestamp: new Date(post.created_at).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }),
        title: post.title || 'Untitled',
        content: post.content || '',
        image: post.image_url ? getImageUrl(post.image_url, '') : undefined,
        image_urls: post.image_urls ? post.image_urls.map(url => getImageUrl(url, '')) : [],
        upvotes: post.upvotes || 0,
        downvotes: post.downvotes || 0,
        comments: [],
        commentCount: commentCount || 0,
        recentComment: recentComments && recentComments.length > 0 ? {
            authorName: recentComments[0].author?.display_name || recentComments[0].author?.username || 'Unknown',
            content: recentComments[0].content
        } : undefined,
        userVote: userVote || null,
        status: post.status
    };
};

module.exports = { formatPostData };
