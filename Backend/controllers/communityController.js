const Community = require('../models/Community');
const Post = require('../models/Post');

const getAllCommunities = async (req, res) => {
    try {
        const communities = await Community.find().sort({ created_at: -1 });
        
        // Kết hợp số lượng bài viết cho mỗi cộng đồng (không phân biệt hoa thường)
        const communitiesWithStats = await Promise.all(communities.map(async (com) => {
            const postCount = await Post.countDocuments({ 
                community: { $regex: new RegExp(`^${com.name}$`, 'i') } 
            });
            return {
                ...com.toObject(),
                postCount
            };
        }));

        return res.status(200).json({ status: 'success', data: communitiesWithStats });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

const createCommunity = async (req, res) => {
    try {
        const { name, description, icon, creator_id } = req.body;
        if (!name) return res.status(400).json({ status: 'fail', message: 'Tên cộng đồng là bắt buộc!' });

        const community = new Community({ name, description, icon, creator: creator_id });
        await community.save();
        return res.status(201).json({ status: 'success', data: community });
    } catch (error) {
        return res.status(400).json({ status: 'error', message: error.message });
    }
};

const deleteCommunity = async (req, res) => {
    try {
        await Community.findByIdAndDelete(req.params.id);
        return res.status(200).json({ status: 'success', message: 'Đã xóa cộng đồng!' });
    } catch (error) {
        return res.status(500).json({ status: 'error', message: error.message });
    }
};

module.exports = { getAllCommunities, createCommunity, deleteCommunity };
