import 'package:flutter/material.dart';
import '../auth/login_screen.dart';
import './settings_screen.dart';
import './edit_profile_screen.dart';
import '../../services/auth_service.dart';
import '../../models/post.dart';
import '../home/main_layout.dart';
import '../../models/comment.dart' as model;
import '../../widgets/post_card.dart';
import '../chat/chat_detail_screen.dart';
import '../../models/conversation.dart';
import '../../services/message_service.dart';

class ProfileScreen extends StatefulWidget {
  final String? userId; // Optional: viewing someone else's profile
  const ProfileScreen({super.key, this.userId});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  List<Post> _userPosts = [];
  List<model.Comment> _userComments = [];
  bool _isLoadingUser = false;
  bool _isLoadingComments = true;
  bool _isLoadingFollowers = false;
  bool _isLoadingFollowing = false;
  User? _profileUser;
  Map<String, dynamic> _userStats = {'posts': 0, 'totalLikes': 0};
  List<User> _followers = [];
  List<User> _following = [];
  String _followerTab = 'followers';

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _fetchData();
  }

  Future<void> _fetchData() async {
    final targetId = widget.userId ?? AuthService.currentUser?.id;
    if (targetId == null) return;

    setState(() {
      _isLoadingUser = true;
      _isLoadingComments = true;
      _isLoadingFollowers = true;
      _isLoadingFollowing = true;
    });

    final data = await AuthService.getAggregatedProfile(targetId);
    
    if (mounted && data != null) {
      setState(() {
        // Map Profile
        if (data['profile'] != null) {
          _profileUser = User.fromJson(data['profile']);
        }
        
        // Map Stats
        if (data['stats'] != null) {
          _userStats = data['stats'];
        }

        // Map Posts
        if (data['userPosts'] != null) {
          final List<dynamic> postsJson = data['userPosts'];
          _userPosts = postsJson.map((j) => Post.fromJson(j)).toList();
        }

        // Map Comments
        if (data['comments'] != null) {
          final List<dynamic> commentsJson = data['comments'];
          _userComments = commentsJson.map((j) => model.Comment.fromJson(j)).toList();
        }

        // Map Followers
        if (data['followers'] != null) {
          final List<dynamic> followersJson = data['followers'];
          _followers = followersJson.map((j) => User.fromJson(j)).toList();
        }

        // Map Following
        if (data['following'] != null) {
          final List<dynamic> followingJson = data['following'];
          _following = followingJson.map((j) => User.fromJson(j)).toList();
        }

        _isLoadingUser = false;
        _isLoadingComments = false;
        _isLoadingFollowers = false;
        _isLoadingFollowing = false;
      });
    } else if (mounted) {
      // Fallback
      if (widget.userId == null) {
        _profileUser = AuthService.currentUser;
      }
      setState(() {
        _isLoadingUser = false;
        _isLoadingComments = false;
        _isLoadingFollowers = false;
        _isLoadingFollowing = false;
      });
    }
  }

  // individual fetch methods are now handled by _fetchData
  void refreshData() => _fetchData();

  @override
  void didUpdateWidget(ProfileScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.userId != oldWidget.userId) {
      _fetchData();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      extendBodyBehindAppBar: true,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        automaticallyImplyLeading: true,
        leading: widget.userId != null ? IconButton(
          icon: Icon(Icons.arrow_back, color: Theme.of(context).colorScheme.onSurface),
          onPressed: () {
            final mainLayout = MainLayout.of(context);
            if (mainLayout != null) {
              mainLayout.setViewingProfile(null);
            } else {
              Navigator.of(context).pop();
            }
          },
        ) : null,
        actions: [
          PopupMenuButton<String>(
            icon: Icon(Icons.menu, color: Theme.of(context).colorScheme.onSurface),
            offset: const Offset(0, 48),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            color: Theme.of(context).cardColor,
            elevation: 6,
            onSelected: (value) {
              if (value == 'edit') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const EditProfileScreen()),
                ).then((_) => _fetchData());
              } else if (value == 'settings') {
                Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const SettingsScreen()),
                );
              } else if (value == 'logout') {
                AuthService.logout();
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                  (route) => false,
                );
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem<String>(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit_outlined, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    Text('Chỉnh sửa trang cá nhân', style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface)),
                  ],
                ),
              ),
              PopupMenuItem<String>(
                value: 'settings',
                child: Row(
                  children: [
                    Icon(Icons.settings_outlined, size: 20, color: Theme.of(context).colorScheme.onSurface),
                    const SizedBox(width: 12),
                    Text('Cài đặt', style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface)),
                  ],
                ),
              ),
              const PopupMenuDivider(),
              const PopupMenuItem<String>(
                value: 'logout',
                child: Row(
                  children: [
                    Icon(Icons.logout, size: 20, color: Color(0xFFD32F2F)),
                    SizedBox(width: 12),
                    Text('Đăng xuất', style: TextStyle(fontSize: 14, color: Color(0xFFD32F2F))),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),

      body: RefreshIndicator(
        onRefresh: () async => _fetchData(),
        notificationPredicate: (notification) => notification.depth == 1,
        child: NestedScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          headerSliverBuilder: (context, innerBoxIsScrolled) => [
            SliverToBoxAdapter(child: _buildProfileHeader()),
            SliverAppBar(
              pinned: true,
              backgroundColor: Theme.of(context).cardColor,
              automaticallyImplyLeading: false,
              toolbarHeight: 0, // No toolbar, just the TabBar
              bottom: PreferredSize(
                preferredSize: const Size.fromHeight(48),
                child: TabBar(
                  controller: _tabController,
                  labelColor: const Color(0xFFD32F2F),
                  unselectedLabelColor: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                  indicatorColor: const Color(0xFFD32F2F),
                  indicatorWeight: 2,
                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                  tabs: const [
                    Tab(text: 'Bài Đăng'),
                    Tab(text: 'Bình luận'),
                    Tab(text: 'Theo dõi'),
                  ],
                ),
              ),
            ),
          ],
          body: TabBarView(
            controller: _tabController,
            children: [
              _buildPostsTab(),
              _buildCommentsTab(),
              _buildCombinedFollowTab(),
            ],
          ),
            ),
          ),
    );
  }

  Widget _buildProfileHeader() {
    return Container(
      color: Theme.of(context).cardColor,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Banner + Avatar Stack
          Stack(
            clipBehavior: Clip.none,
            children: [
              Container(
                height: 120,
                width: double.infinity,
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [Color(0xFFD32F2F), Color(0xFFFF8A65)],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              ),
              Positioned(
                bottom: -30,
                left: 16,
                child: Container(
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: Theme.of(context).cardColor, width: 3),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withAlpha((0.1 * 255).round()), blurRadius: 10, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: CircleAvatar(
                    radius: 40,
                    backgroundColor: Colors.grey.shade100,
                    backgroundImage: NetworkImage(_profileUser?.fullProfilePicture ?? AuthService.currentUser?.fullProfilePicture ?? 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200'),
                  ),
                ),
              ),
            ],
          ),

          const SizedBox(height: 40),

          // Name and Stats
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _profileUser?.displayName ?? _profileUser?.username ?? AuthService.currentUser?.displayName ?? AuthService.currentUser?.username ?? 'Tô Chính Hiệu',
                  style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Text('${_userStats['totalLikes'] ?? 0} Bình chọn', style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFFD32F2F))),
                    const Text('  •  ', style: TextStyle(color: Colors.grey)),
                    Text('${_userStats['posts'] ?? 0} Bài đăng', style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()))),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    _buildStatLabel((_profileUser?.followersCount ?? 0).toString(), 'Người theo dõi'),
                    const SizedBox(width: 24),
                    _buildStatLabel((_profileUser?.followingCount ?? 0).toString(), 'Đang theo dõi'),
                  ],
                ),
                if (widget.userId != null && widget.userId != AuthService.currentUser?.id && _profileUser?.id != AuthService.currentUser?.id) ...[
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: _toggleFollow,
                          icon: _profileUser?.isFollowing == true ? const Icon(Icons.check, size: 18) : const Icon(Icons.person_add_outlined, size: 18),
                          label: Text(_profileUser?.isFollowing == true ? 'Đã theo dõi' : 'Theo dõi'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: _profileUser?.isFollowing == true ? Colors.grey[200] : const Color(0xFFD32F2F),
                            foregroundColor: _profileUser?.isFollowing == true ? Colors.black87 : Colors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () async {
                            final conv = await MessageService.startConversation(_profileUser!.id);
                            if (conv != null && mounted) {
                              Navigator.of(context).push(MaterialPageRoute(
                                builder: (_) => ChatDetailScreen(
                                  conversation: conv,
                                  otherUser: MessageParticipant(
                                    id: _profileUser!.id,
                                    username: _profileUser!.username,
                                    fullName: _profileUser!.displayName ?? _profileUser!.username,
                                    avatarUrl: _profileUser!.fullProfilePicture,
                                  ),
                                )
                              ));
                            } else {
                              if (mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Không thể tạo cuộc trò chuyện')),
                                );
                              }
                            }
                          },
                          icon: const Icon(Icons.chat_bubble_outline, size: 18),
                          label: const Text('Nhắn tin'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Theme.of(context).cardColor,
                            foregroundColor: Theme.of(context).colorScheme.onSurface,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(20),
                              side: BorderSide(color: Theme.of(context).dividerColor),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),

          if ((_profileUser?.bio ?? AuthService.currentUser?.bio)?.isNotEmpty == true) ...[
            const SizedBox(height: 12),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                _profileUser?.bio ?? AuthService.currentUser!.bio!,
                style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface, height: 1.4),
              ),
            ),
          ],

          const SizedBox(height: 12),
          
          // Profile Information Badges (Location, Website, MSSV, Major)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 12),
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if ((_profileUser?.location ?? AuthService.currentUser?.location)?.isNotEmpty == true)
                  _buildBadge(
                    icon: Icons.location_on_outlined,
                    label: _profileUser?.location ?? AuthService.currentUser!.location!,
                    backgroundColor: Colors.grey.shade100,
                    textColor: Colors.grey.shade700,
                    borderColor: Colors.grey.shade200,
                  ),
                if ((_profileUser?.website ?? AuthService.currentUser?.website)?.isNotEmpty == true)
                  _buildBadge(
                    icon: Icons.link_outlined,
                    label: 'Website',
                    backgroundColor: Colors.grey.shade100,
                    textColor: const Color(0xFFD32F2F),
                    borderColor: Colors.grey.shade200,
                  ),
                if ((_profileUser?.mssv ?? AuthService.currentUser?.mssv)?.isNotEmpty == true)
                  _buildBadge(
                    icon: Icons.school_outlined,
                    label: 'MSSV: ${_profileUser?.mssv ?? AuthService.currentUser!.mssv!}',
                    backgroundColor: const Color(0xFFFEF2F2), // bg-red-50
                    textColor: const Color(0xFFDC2626),       // text-red-600
                    borderColor: const Color(0xFFFEE2E2).withAlpha((0.5 * 255).round()), // border-red-100/50
                  ),
                if ((_profileUser?.faculty ?? AuthService.currentUser?.faculty)?.isNotEmpty == true)
                  _buildBadge(
                    icon: Icons.book_outlined,
                    label: _profileUser?.faculty ?? AuthService.currentUser!.faculty!,
                    backgroundColor: const Color(0xFFFFF7ED), // bg-orange-50
                    textColor: const Color(0xFFEA580C),       // text-orange-600
                    borderColor: const Color(0xFFFFEDD5).withAlpha((0.5 * 255).round()), // border-orange-100/50
                  ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildBadge({
    required IconData icon,
    required String label,
    required Color backgroundColor,
    required Color textColor,
    required Color borderColor,
    VoidCallback? onTap,
  }) {
    Widget content = Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 14, color: textColor),
          const SizedBox(width: 6),
          Flexible(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: textColor,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
        ],
      ),
    );

    if (onTap != null) {
      return InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: content,
      );
    }

    return content;
  }

  Widget _buildStatLabel(String count, String label) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(count, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
        Text(label, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()))),
      ],
    );
  }

  Future<void> _toggleFollow() async {
    if (_profileUser == null) return;
    
    final bool isFollowing = _profileUser!.isFollowing;
    final currentUser = AuthService.currentUser;

    // Optimistic toggle
    setState(() {
      _profileUser!.isFollowing = !isFollowing;
      if (currentUser != null) {
        if (!isFollowing) {
          _followers.add(currentUser);
        } else {
          _followers.removeWhere((u) => u.id == currentUser.id);
        }
      }
    });

    final result = isFollowing 
        ? await AuthService.unfollowUser(_profileUser!.id)
        : await AuthService.followUser(_profileUser!.id);
        
    if (!result['success']) {
      // Revert optimistic update on failure
      setState(() {
        _profileUser!.isFollowing = isFollowing;
        if (currentUser != null) {
          if (isFollowing) {
            _followers.add(currentUser);
          } else {
            _followers.removeWhere((u) => u.id == currentUser.id);
          }
        }
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'])),
      );
    }
  }

  Widget _buildCombinedFollowTab() {
    if (_isLoadingFollowers || _isLoadingFollowing) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFD32F2F)));
    }

    final isFollowers = _followerTab == 'followers';
    final currentList = isFollowers ? _followers : _following;

    return CustomScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      slivers: [
        SliverToBoxAdapter(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Container(
              padding: const EdgeInsets.all(4),
              decoration: BoxDecoration(
                color: Theme.of(context).brightness == Brightness.light ? Colors.grey.shade200 : const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Row(
                children: [
                   Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _followerTab = 'followers'),
                      child: Container(
                         padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: isFollowers ? Theme.of(context).cardColor : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: isFollowers ? [const BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(0, 1))] : [],
                        ),
                        alignment: Alignment.center,
                        child: Text('Theo dõi (${_profileUser?.followersCount ?? _followers.length})', 
                          style: TextStyle(
                            fontWeight: FontWeight.bold, 
                            fontSize: 13,
                            color: isFollowers ? Theme.of(context).colorScheme.onSurface : Theme.of(context).colorScheme.onSurface.withAlpha(150)
                          )),
                      ),
                    ),
                  ),
                  Expanded(
                    child: GestureDetector(
                      onTap: () => setState(() => _followerTab = 'following'),
                      child: Container(
                         padding: const EdgeInsets.symmetric(vertical: 8),
                        decoration: BoxDecoration(
                          color: !isFollowers ? Theme.of(context).cardColor : Colors.transparent,
                          borderRadius: BorderRadius.circular(8),
                          boxShadow: !isFollowers ? [const BoxShadow(color: Colors.black12, blurRadius: 2, offset: Offset(0, 1))] : [],
                        ),
                        alignment: Alignment.center,
                        child: Text('Đang theo dõi (${_profileUser?.followingCount ?? _following.length})', 
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: !isFollowers ? Theme.of(context).colorScheme.onSurface : Theme.of(context).colorScheme.onSurface.withAlpha(150)
                          )),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        if (currentList.isEmpty)
          const SliverFillRemaining(
            child: Center(child: Text('Chưa có ai trong danh sách này')),
          )
        else
          SliverList(
            delegate: SliverChildBuilderDelegate(
              (context, index) => Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8),
                child: Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  elevation: 0,
                  color: Theme.of(context).cardColor,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                    side: BorderSide(color: Theme.of(context).dividerColor.withAlpha(50)),
                  ),
                  child: _buildUserListTile(currentList[index])
                ),
              ),
              childCount: currentList.length,
            ),
          ),
      ],
    );
  }

  Widget _buildUserListTile(User user) {
    return ListTile(
      leading: CircleAvatar(
        radius: 20,
        backgroundImage: NetworkImage(user.fullProfilePicture ?? 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200'),
      ),
      title: Text(user.displayName ?? user.username, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
      subtitle: Text('@${user.username}', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withAlpha(150))),
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(builder: (_) => ProfileScreen(userId: user.id)),
        );
      },
    );
  }

  Widget _buildPostsTab() {
    if (_isLoadingUser) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFD32F2F)));
    }

    if (_userPosts.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 64),
          Center(
            child: Column(
              children: [
                Icon(Icons.article_outlined, size: 72, color: Theme.of(context).dividerColor),
                const SizedBox(height: 16),
                Text('Bạn chưa có bài đăng nào', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                const SizedBox(height: 8),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 40),
                  child: Text(
                    'Khi bạn đăng bài vào một chủ đề, bài đăng đó sẽ hiển thị ở đây.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()), height: 1.5),
                  ),
                ),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 16),
      itemCount: _userPosts.length,
      itemBuilder: (context, index) {
        return PostCard(
          post: _userPosts[index],
          onRefresh: _fetchData,
        );
      },
    );
  }

  Widget _buildCommentsTab() {
    if (_isLoadingComments) {
      return const Center(child: CircularProgressIndicator(color: Color(0xFFD32F2F)));
    }

    if (_userComments.isEmpty) {
      return ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: [
          const SizedBox(height: 64),
          Center(
            child: Column(
              children: [
                 Icon(Icons.chat_bubble_outline, size: 72, color: Theme.of(context).dividerColor),
                 const SizedBox(height: 16),
                 Text('Chưa có bình luận nào', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                 const SizedBox(height: 8),
                 Text('Các bình luận của bạn sẽ hiển thị ở đây.', style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()))),
              ],
            ),
          ),
        ],
      );
    }

    return ListView.builder(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.symmetric(vertical: 8),
      itemCount: _userComments.length,
      itemBuilder: (context, index) {
        return _buildCommentItem(_userComments[index]);
      },
    );
  }

  Widget _buildCommentItem(model.Comment comment) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      elevation: 0,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: BorderSide(color: Theme.of(context).dividerColor),
      ),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Header info
            Row(
              children: [
                const Icon(Icons.mode_comment_outlined, size: 16, color: Colors.blue),
                const SizedBox(width: 8),
                Expanded(
                  child: RichText(
                    text: TextSpan(
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round())),
                      children: [
                        const TextSpan(text: 'Bình luận trên bài viết: '),
                        TextSpan(
                          text: '"${comment.postTitle ?? 'Không rõ'}"',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontStyle: FontStyle.italic,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 4),
            Text(
              '${comment.createdAt.day}/${comment.createdAt.month}/${comment.createdAt.year} ${comment.createdAt.hour}:${comment.createdAt.minute.toString().padLeft(2, '0')}',
              style: TextStyle(fontSize: 11, color: Colors.grey.shade500),
            ),
            const SizedBox(height: 10),
            // Content
            Text(
              comment.plainContent,
              style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface, height: 1.4),
            ),
            if (comment.fullImageUrl != null) ...[
              const SizedBox(height: 8),
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(
                  comment.fullImageUrl!,
                  height: 150,
                  width: double.infinity,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => const SizedBox.shrink(),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
