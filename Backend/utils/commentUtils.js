/**
 * Utility to calculate the total number of comments and threads (replies) for a given post.
 * 
 * @param {Object} CommentModel - The Mongoose Comment model
 * @param {Object} ThreadModel - The Mongoose Thread model
 * @param {string|Object} postId - The ID of the post
 * @returns {Promise<number>} - Total count of comments and replies
 */
const getPostCommentAndThreadCount = async (CommentModel, ThreadModel, postId) => {
    try {
        const baseCommentCount = await CommentModel.countDocuments({ post: postId });
        const commentIds = await CommentModel.distinct('_id', { post: postId });
        const threadCount = await ThreadModel.countDocuments({ comment: { $in: commentIds } });
        return baseCommentCount + threadCount;
    } catch (error) {
        console.error(`[COMMENT UTILITY] Error counting comments for post ${postId}:`, error.message);
        return 0;
    }
};

module.exports = {
    getPostCommentAndThreadCount
};
