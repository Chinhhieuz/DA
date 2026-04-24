import 'package:flutter/material.dart';
import '../../models/community.dart';
import '../../models/post.dart';
import '../../services/post_service.dart';
import '../../widgets/post_card.dart';

class CommunityDetailScreen extends StatefulWidget {
  final Community community;
  const CommunityDetailScreen({super.key, required this.community});

  @override
  State<CommunityDetailScreen> createState() => _CommunityDetailScreenState();
}

class _CommunityDetailScreenState extends State<CommunityDetailScreen> {
  List<Post> _posts = [];
  bool _isLoading = true;
  bool _isLoadingMore = false;
  int _currentPage = 1;
  bool _hasMore = true;
  final ScrollController _scrollController = ScrollController();

  @override
  void initState() {
    super.initState();
    _fetchPosts();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
      if (!_isLoading && !_isLoadingMore && _hasMore) {
        _fetchMorePosts();
      }
    }
  }

  Future<void> _fetchPosts() async {
    setState(() {
      _isLoading = true;
      _currentPage = 1;
      _hasMore = true;
    });

    final response = await PostService.getPosts(
      community: widget.community.name,
      page: 1,
      limit: 10,
    );

    if (mounted) {
      setState(() {
        _posts = response['posts'] as List<Post>;
        _hasMore = response['hasMore'] ?? false;
        _isLoading = false;
      });
    }
  }

  Future<void> _fetchMorePosts() async {
    if (_isLoadingMore || !_hasMore) return;

    setState(() => _isLoadingMore = true);

    try {
      final nextPage = _currentPage + 1;
      final response = await PostService.getPosts(
        community: widget.community.name,
        page: nextPage,
        limit: 10,
      );

      final newPosts = response['posts'] as List<Post>;
      final moreAvailable = response['hasMore'] ?? false;

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
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).primaryColor,
        foregroundColor: Colors.white,
        elevation: 2,
        title: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(
                color: Colors.white.withAlpha((0.2 * 255).round()),
                shape: BoxShape.circle,
              ),
              child: Text(widget.community.icon, style: const TextStyle(fontSize: 16)),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'r/${widget.community.name}',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    '${widget.community.postCount} bài viết',
                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.normal),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _fetchPosts,
              child: _posts.isEmpty
                  ? SingleChildScrollView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      child: Container(
                        height: MediaQuery.of(context).size.height - 150,
                        alignment: Alignment.center,
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.post_add_outlined, size: 64, color: Colors.grey.shade400),
                            const SizedBox(height: 16),
                            Text(
                              'Chưa có bài viết nào trong chủ đề này',
                              style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()), fontSize: 16),
                            ),
                          ],
                        ),
                      ),
                    )
                  : ListView.builder(
                      controller: _scrollController,
                      itemCount: _posts.length + (_hasMore ? 1 : 0),
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      itemBuilder: (context, index) {
                        if (index == _posts.length) {
                          return const Padding(
                            padding: EdgeInsets.symmetric(vertical: 20),
                            child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
                          );
                        }
                        return PostCard(
                          post: _posts[index],
                          onRefresh: _fetchPosts,
                        );
                      },
                    ),
            ),
    );
  }
}
