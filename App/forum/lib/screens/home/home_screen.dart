import 'package:flutter/material.dart';
import '../../models/post.dart';
import '../../services/post_service.dart';
import '../../services/auth_service.dart';
import '../../widgets/post_card.dart';
import '../../utils/responsive.dart';

class HomeScreen extends StatefulWidget {
  final String searchQuery;
  final String feedTitle;
  const HomeScreen({
    super.key,
    this.searchQuery = '',
    this.feedTitle = 'Mới nhất',
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  List<Post> _posts = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  int _currentPage = 1;
  bool _hasMore = true;
  final ScrollController _scrollController = ScrollController();
  String? _error;
  List<User> _searchedUsers = [];
  bool _isSearchingUsers = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _fetchPosts();
    if (widget.searchQuery.isNotEmpty) {
      _searchUsers();
    }
    // Refresh feed when AI approves a new post
    PostService.refreshFeedNotifier.addListener(_onFeedRefreshRequested);
  }

  void _onFeedRefreshRequested() {
    _fetchPosts();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoading && !_isLoadingMore && _hasMore) {
        _fetchMorePosts();
      }
    }
  }

  Future<void> _searchUsers() async {
    if (widget.searchQuery.isEmpty) {
      if (mounted) setState(() => _searchedUsers = []);
      return;
    }
    setState(() => _isSearchingUsers = true);
    final users = await AuthService.searchUsers(widget.searchQuery);
    if (mounted) {
      setState(() {
        _searchedUsers = users;
        _isSearchingUsers = false;
      });
    }
  }

  @override
  void didUpdateWidget(HomeScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.feedTitle != oldWidget.feedTitle) {
      _fetchPosts();
    }
    if (widget.searchQuery != oldWidget.searchQuery) {
      _searchUsers();
    }
  }

  Future<void> _fetchPosts() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _error = null;
      _currentPage = 1;
      _hasMore = true;
    });

    try {
      List<Post> posts = [];
      bool hasMore = false;

      if (widget.feedTitle == 'Đã lưu') {
        final userId = AuthService.currentUser?.id;
        if (userId != null) {
          posts = await PostService.getSavedPosts(userId);
        } else {
          _error = 'Bạn cần đăng nhập để xem bài viết đã lưu';
        }
      } else {
        final result = await PostService.getPosts(
          page: 1, 
          limit: 10,
          sort: widget.feedTitle == 'Phổ biến' ? 'popular' : (widget.feedTitle == 'Top' ? 'top' : null)
        );
        posts = result['posts'] ?? [];
        hasMore = result['hasMore'] ?? false;
      }
      
      if (mounted) {
        setState(() {
          _posts = posts;
          _hasMore = hasMore;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Không thể tải bài viết: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _fetchMorePosts() async {
    if (_isLoadingMore || !_hasMore) return;
    
    setState(() => _isLoadingMore = true);

    try {
      final nextPage = _currentPage + 1;
      final result = await PostService.getPosts(
        page: nextPage, 
        limit: 10,
        sort: widget.feedTitle == 'Phổ biến' ? 'popular' : (widget.feedTitle == 'Top' ? 'top' : null)
      );
      
      final List<Post> newPosts = result['posts'] ?? [];
      final bool moreAvailable = result['hasMore'] ?? false;
      
      if (mounted) {
        setState(() {
          _posts.addAll(newPosts);
          _currentPage = nextPage;
          _hasMore = moreAvailable;
          _isLoadingMore = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoadingMore = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth > 800;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            flex: 7,
            child: RefreshIndicator(
              onRefresh: _fetchPosts,
              child: ListView(
                controller: _scrollController,
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          widget.feedTitle,
                          style: TextStyle(fontSize: 18.sp(context), fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface),
                        ),
                        const SizedBox(height: 8),
                      ],
                    ),
                  ),
                  if (_isLoading)
                    const Center(child: Padding(padding: EdgeInsets.all(32), child: CircularProgressIndicator()))
                  else if (_error != null)
                    Center(child: Padding(padding: const EdgeInsets.all(32), child: Text(_error!, style: const TextStyle(color: Colors.red))))
                  else
                    ..._buildFilteredPosts(context: context, isDesktop: isDesktop),
                  
                  if (_isLoadingMore)
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 20),
                      child: Center(
                        child: Column(
                          children: [
                            CircularProgressIndicator(strokeWidth: 2),
                            SizedBox(height: 8),
                            Text('Đang tải thêm bài viết...', style: TextStyle(fontSize: 12, color: Colors.grey)),
                          ],
                        ),
                      ),
                    )
                  else if (!_hasMore && _posts.isNotEmpty && widget.feedTitle != 'Đã lưu')
                    const Padding(
                      padding: EdgeInsets.symmetric(vertical: 32),
                      child: Center(
                        child: Text('Đã tải hết bài viết', style: TextStyle(fontSize: 13, color: Colors.grey, fontStyle: FontStyle.italic)),
                      ),
                    ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ),

          // Desktop right sidebar
          if (isDesktop)
            SizedBox(
              width: 280,
              child: Container(
                color: Theme.of(context).scaffoldBackgroundColor,
                padding: const EdgeInsets.all(16),
                child: Column(
                  children: [
                    const SizedBox(height: 16),
                    _buildRulesCard(),
                  ],
                ),
              ),
            ),
        ],
      ),
    );
  }

  List<Widget> _buildFilteredPosts({required BuildContext context, required bool isDesktop}) {
    final query = widget.searchQuery.toLowerCase().trim();
    final filtered = query.isEmpty
        ? _posts
        : _posts.where((p) =>
            p.title.toLowerCase().contains(query) ||
            p.content.toLowerCase().contains(query) ||
            (p.community?.toLowerCase() ?? '').contains(query)).toList();

    List<Widget> children = [];

    if (query.isNotEmpty) {
      if (_isSearchingUsers) {
        children.add(const Center(child: Padding(padding: EdgeInsets.all(16), child: CircularProgressIndicator())));
      } else if (_searchedUsers.isNotEmpty) {
        children.add(
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Text('NGƯỜI DÙNG', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()))),
          ),
        );
        children.add(
          SizedBox(
            height: 120,
            child: ListView.builder(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              itemCount: _searchedUsers.length,
              itemBuilder: (context, index) {
                final user = _searchedUsers[index];
                return Container(
                  width: 140,
                  margin: const EdgeInsets.only(right: 12),
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Theme.of(context).dividerColor),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundImage: NetworkImage(user.fullProfilePicture ?? 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200'),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        user.displayName ?? user.username,
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      Text(
                        '@${user.username}',
                        style: TextStyle(fontSize: 11, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round())),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        );
        children.add(const SizedBox(height: 16));
      }

      children.add(
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text('BÀI VIẾT', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()))),
        ),
      );
    }

    if (filtered.isEmpty) {
      children.add(
        Padding(
          padding: const EdgeInsets.all(32),
          child: Center(
            child: Text(
              _error != null ? _error! : (widget.feedTitle == 'Đã lưu' ? 'Bạn chưa lưu bài viết nào.' : 'Không tìm thấy bài viết phù hợp.'), 
              style: const TextStyle(color: Colors.black45),
              textAlign: TextAlign.center,
            ),
          ),
        ),
      );
    } else {
      children.addAll(filtered.map((p) => PostCard(
        post: p,
        onRefresh: _fetchPosts,
      )));
    }

    return children;
  }

  Widget _buildRulesCard() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(color: Theme.of(context).cardColor, borderRadius: BorderRadius.circular(12), border: Border.all(color: Theme.of(context).dividerColor)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(children: [const Icon(Icons.shield_outlined, size: 20, color: Color(0xFFD32F2F)), const SizedBox(width: 8), Text('Quy tắc cộng đồng', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface))]),
          const SizedBox(height: 12),
          Text('1. Tôn trọng người dùng khác', style: TextStyle(fontSize: 13, height: 1.5, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 4),
          Text('2. Không spam / quảng cáo', style: TextStyle(fontSize: 13, height: 1.5, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 4),
          Text('3. Đăng bài đúng chuyên mục', style: TextStyle(fontSize: 13, height: 1.5, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 4),
          Text('4. Không chia sẻ nội dung độc hại', style: TextStyle(fontSize: 13, height: 1.5, color: Theme.of(context).colorScheme.onSurface)),
        ],
      ),
    );
  }
}
