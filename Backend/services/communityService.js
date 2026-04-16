const Community = require('../models/Community');
const Post = require('../models/Post');

const getAllCommunitiesService = async () => {
    const communities = await Community.find().sort({ created_at: -1 });

    const postCounts = await Post.aggregate([
        {
            $group: {
                _id: { $toLower: { $ifNull: ['$community', ''] } },
                postCount: { $sum: 1 }
            }
        }
    ]);

    const postCountMap = new Map(
        postCounts.map((item) => [String(item._id || ''), Number(item.postCount || 0)])
    );

    const communitiesWithStats = communities.map((com) => {
        const key = String(com.name || '').toLowerCase();
        const postCount = postCountMap.get(key) || 0;
        return { ...com.toObject(), postCount };
    });

    return communitiesWithStats;
};

const createCommunityService = async ({ name, description, icon, creator_id }) => {
    if (!name) throw new Error('Tên cộng đồng là bắt buộc!');

    const community = new Community({ name, description, icon, creator: creator_id });
    await community.save();
    return community;
};

const updateCommunityService = async (id, { name, description, icon }) => {
    const community = await Community.findByIdAndUpdate(
        id,
        { name, description, icon },
        { new: true }
    );
    if (!community) throw new Error('NOT_FOUND:Không tìm thấy chủ đề!');
    return community;
};

const deleteCommunityService = async (id) => {
    const community = await Community.findByIdAndDelete(id);
    if (!community) throw new Error('NOT_FOUND:Không tìm thấy chủ đề!');
    return true;
};

module.exports = {
    getAllCommunitiesService,
    createCommunityService,
    updateCommunityService,
    deleteCommunityService
};
