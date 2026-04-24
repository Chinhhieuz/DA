import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/post_service.dart';
import '../../services/community_service.dart';
import '../../models/post.dart';

import '../../models/community.dart';
import '../../widgets/post_card.dart';
import '../profile/profile_screen.dart';
import '../community/community_detail_screen.dart';
import '../../utils/responsive.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  final FocusNode _searchFocus = FocusNode();

  String _searchQuery = '';
  bool _isSearching = false;
  
  List<Community> _trendingTopics = [];
  List<User> _searchedUsers = [];
  List<Post> _searchedPosts = [];

  @override
  void initState() {
    super.initState();
    _fetchTrendingTopics();
    _searchFocus.requestFocus(); // Auto focus on open
  }

  @override
  void dispose() {
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  Future<void> _fetchTrendingTopics() async {
    final communities = await CommunityService.getCommunities();
    communities.sort((a, b) => b.postCount.compareTo(a.postCount));
    if (mounted) {
      setState(() {
        _trendingTopics = communities.take(7).toList();
      });
    }
  }

  Future<void> _performSearch(String query) async {
    final trimmedQuery = query.trim();
    if (trimmedQuery.isEmpty) {
      if (mounted) {
        setState(() {
          _searchQuery = '';
          _searchedUsers = [];
          _searchedPosts = [];
          _isSearching = false;
        });
      }
      return;
    }

    if (trimmedQuery == _searchQuery) return;
    
    setState(() {
      _searchQuery = trimmedQuery;
      _isSearching = true;
    });

    final results = await Future.wait([
      AuthService.searchUsers(trimmedQuery),
      PostService.searchPosts(trimmedQuery),
    ]);

    if (mounted && _searchQuery == trimmedQuery) {
      setState(() {
        _searchedUsers = results[0] as List<User>;
        _searchedPosts = results[1] as List<Post>;
        _isSearching = false;
      });
    }
  }

  Future<void> _toggleFollowUser(User user, int index) async {
    if (AuthService.currentUser == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng đăng nhập để theo dõi!')),
      );
      return;
    }

    final isFollowing = user.isFollowing;
    
    // Optimistic UI update
    setState(() {
      _searchedUsers[index] = User(
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profilePicture: user.profilePicture,
        displayName: user.displayName,
        bio: user.bio,
        location: user.location,
        website: user.website,
        mssv: user.mssv,
        faculty: user.faculty,
        followersCount: user.followersCount,
        followingCount: user.followingCount,
        isFollowing: !isFollowing,
      );
    });

    final result = isFollowing 
        ? await AuthService.unfollowUser(user.id)
        : await AuthService.followUser(user.id);
        
    if (!result['success']) {
      // Revert if failed
      if (mounted) {
        setState(() {
          _searchedUsers[index] = User(
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            profilePicture: user.profilePicture,
            displayName: user.displayName,
            bio: user.bio,
            location: user.location,
            website: user.website,
            mssv: user.mssv,
            faculty: user.faculty,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            isFollowing: isFollowing,
          );
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['message'])),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SingleChildScrollView(
        physics: const BouncingScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.only(bottom: 40),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ---------------- HERO SECTION ----------------
              Container(
                width: double.infinity,
                padding: EdgeInsets.fromLTRB(16.sp(context), 50.sp(context), 16.sp(context), 24.sp(context)),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.grey.shade50,
                  border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        IconButton(
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(),
                          icon: const Icon(Icons.arrow_back),
                          onPressed: () => Navigator.of(context).pop(),
                        ),
                        const SizedBox(width: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                          decoration: BoxDecoration(
                            color: const Color(0xFFD32F2F).withAlpha((0.1 * 255).round()),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: const Text('SEARCH HUB', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFD32F2F), letterSpacing: 1.5)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Tìm bài viết, người dùng và chủ đề nhanh hơn.',
                      style: TextStyle(
                        fontSize: 22.sp(context),
                        fontWeight: FontWeight.w900,
                        color: Theme.of(context).colorScheme.onSurface,
                        letterSpacing: -0.5,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Gộp kết quả theo người dùng và bài viết trong cùng một luồng để bạn khám phá nội dung không bị rối.',
                      style: TextStyle(
                        fontSize: 13.sp(context),
                        color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Stats grid
                    Row(
                      children: [
                        Expanded(child: _buildHeroStat('Chủ đề', _trendingTopics.length.toString(), 'Đang gợi ý')),
                        const SizedBox(width: 12),
                        Expanded(child: _buildHeroStat('Bài viết', _searchedPosts.length.toString(), _isSearching ? 'Đang cập nhật' : 'Khớp từ khóa')),
                        const SizedBox(width: 12),
                        Expanded(child: _buildHeroStat('Người dùng', _searchedUsers.length.toString(), 'Có thể kết nối')),
                      ],
                    ),
                  ],
                ),
              ),

              // ---------------- SEARCH INPUT ----------------
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                child: Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withAlpha((0.03 * 255).round()),
                        blurRadius: 10, offset: const Offset(0, 4),
                      ),
                    ],
                    border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
                  ),
                  padding: const EdgeInsets.all(16),
                  child: TextField(
                    controller: _searchController,
                    focusNode: _searchFocus,
                    onChanged: (val) {
                      _performSearch(val);
                    },
                    decoration: InputDecoration(
                      hintText: 'Tìm bài viết, người dùng...',
                      hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha((0.4 * 255).round())),
                      prefixIcon: const Icon(Icons.search, color: Colors.grey),
                      filled: true,
                      fillColor: isDark ? const Color(0xFF161E2E) : Colors.grey.shade100,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide.none,
                      ),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.close, size: 20),
                              onPressed: () {
                                _searchController.clear();
                                _performSearch('');
                              },
                            )
                          : null,
                    ),
                    style: TextStyle(
                      fontSize: 14.sp(context),
                      color: Theme.of(context).colorScheme.onSurface,
                    ),
                  ),
                ),
              ),

              // ---------------- CONTENT AREA ----------------
              _buildTrendingTopics(),
              const SizedBox(height: 12),
              if (_searchQuery.isNotEmpty) _buildSearchResults()
              else _buildInitialState(),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroStat(String title, String value, String desc) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF161E2E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title.toUpperCase(), style: TextStyle(fontSize: 9.sp(context), fontWeight: FontWeight.w900, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()), letterSpacing: 1.5)),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 20.sp(context), fontWeight: FontWeight.w900, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 4),
          Text(desc, style: TextStyle(fontSize: 10.sp(context), color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()))),
        ],
      ),
    );
  }

  Widget _buildTrendingTopics() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    const Icon(Icons.trending_up, color: Color(0xFFD32F2F), size: 20),
                    const SizedBox(width: 8),
                    Text(
                      'Chủ đề đang thịnh hành',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Wrap(
                  spacing: 8,
                  runSpacing: 12,
                  children: _trendingTopics.map((topic) => GestureDetector(
                    onTap: () {
                      Navigator.of(context).push(MaterialPageRoute(
                        builder: (_) => CommunityDetailScreen(community: topic),
                      ));
                    },
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      decoration: BoxDecoration(
                        color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF1E293B) : Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(topic.icon, style: const TextStyle(fontSize: 16)),
                          const SizedBox(width: 8),
                          Text(
                            topic.name,
                            style: TextStyle(
                              fontWeight: FontWeight.w600,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Text(
                            '- ${topic.postCount} bài',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                            ),
                          ),
                        ],
                      ),
                    ),
                  )).toList(),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInitialState() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Container(
        padding: const EdgeInsets.all(40),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(24),
          border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
        ),
        width: double.infinity,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: const Color(0xFFD32F2F).withAlpha((0.1 * 255).round()),
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.search, size: 24, color: Color(0xFFD32F2F)),
            ),
            const SizedBox(height: 16),
            Text(
              'Nhập từ khóa để bắt đầu tìm kiếm',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
            ),
            const SizedBox(height: 8),
            Text(
              'Bạn có thể tìm theo tiêu đề bài viết hoặc tên người dùng.\nCác chủ đề phía trên sẽ đưa bạn tới thẳng cộng đồng đó.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()), fontSize: 13, height: 1.4),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSearchResults() {
    if (_isSearching) {
      return const Padding(
        padding: EdgeInsets.only(top: 40),
        child: Center(child: CircularProgressIndicator(color: Color(0xFFD32F2F))),
      );
    }

    if (_searchedUsers.isEmpty && _searchedPosts.isEmpty) {
      return Padding(
        padding: const EdgeInsets.all(20),
        child: Container(
          padding: const EdgeInsets.all(40),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
          ),
          width: double.infinity,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              const Icon(Icons.search_off, size: 48, color: Colors.grey),
              const SizedBox(height: 16),
              Text(
                'Không tìm thấy bài viết nào',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
              ),
              const SizedBox(height: 8),
              Text(
                'Thử từ khóa ngắn hơn hoặc chuyển sang chủ đề gần đúng hơn.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()), fontSize: 13, height: 1.4),
              ),
            ],
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Tìm thấy ${_searchedPosts.length} bài viết và ${_searchedUsers.length} người dùng cho "$_searchQuery"',
            style: TextStyle(
              fontSize: 14,
              color: Theme.of(context).colorScheme.onSurface.withAlpha(160),
            ),
          ),
          const SizedBox(height: 20),
          
          if (_searchedUsers.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'NGƯỜI DÙNG',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                      color: Theme.of(context).colorScheme.onSurface.withAlpha(150),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: _searchedUsers.length,
                    separatorBuilder: (_, _) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final user = _searchedUsers[index];
                      return GestureDetector(
                        onTap: () {
                          Navigator.of(context).push(MaterialPageRoute(
                            builder: (_) => ProfileScreen(userId: user.id),
                          ));
                        },
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Theme.of(context).brightness == Brightness.dark ? const Color(0xFF1E293B) : Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(22),
                          ),
                          child: Row(
                            children: [
                              Container(
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  border: Border.all(color: Colors.white, width: 2),
                                  boxShadow: [
                                    BoxShadow(color: Colors.black.withAlpha(10), blurRadius: 4),
                                  ],
                                ),
                                child: CircleAvatar(
                                  radius: 22,
                                  backgroundColor: Colors.grey.shade200,
                                  backgroundImage: NetworkImage(user.fullProfilePicture ?? 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200'),
                                ),
                              ),
                              const SizedBox(width: 14),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      user.displayName ?? user.username,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14.sp(context),
                                        color: Theme.of(context).colorScheme.onSurface,
                                      ),
                                    ),
                                    Text(
                                      '@${user.username}',
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        fontSize: 12.sp(context),
                                        color: Theme.of(context).colorScheme.onSurface.withAlpha(150),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              if (user.id != AuthService.currentUser?.id)
                                ElevatedButton.icon(
                                  onPressed: () => _toggleFollowUser(user, index),
                                  icon: Icon(
                                    user.isFollowing ? Icons.check : Icons.person_add_alt_1,
                                    size: 14,
                                  ),
                                  label: Text(user.isFollowing ? 'Đang theo dõi' : 'Theo dõi', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: user.isFollowing ? Theme.of(context).dividerColor.withValues(alpha: 0.1) : Colors.transparent,
                                    foregroundColor: user.isFollowing ? Theme.of(context).colorScheme.onSurface.withAlpha(150) : const Color(0xFFD32F2F),
                                    elevation: 0,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(20),
                                      side: BorderSide(color: user.isFollowing ? Colors.transparent : const Color(0xFFD32F2F).withValues(alpha: 0.2)),
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
                                    minimumSize: const Size(0, 32),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],

          if (_searchedPosts.isNotEmpty) ...[
            Text(
              'BÀI VIẾT',
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w900,
                letterSpacing: 2,
                color: Theme.of(context).colorScheme.onSurface.withAlpha(150),
              ),
            ),
            const SizedBox(height: 12),
            ..._searchedPosts.map((post) => PostCard(
              post: post,
              onRefresh: () {},
            )),
          ],
        ],
      ),
    );
  }
}
