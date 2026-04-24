import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/post_service.dart';
import '../../models/post.dart';
import '../../widgets/post_card.dart';

class SavedPostsScreen extends StatefulWidget {
  const SavedPostsScreen({super.key});

  @override
  State<SavedPostsScreen> createState() => _SavedPostsScreenState();
}

class _SavedPostsScreenState extends State<SavedPostsScreen> {
  List<Post> _savedPosts = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchSavedPosts();
  }

  Future<void> _fetchSavedPosts() async {
    final userId = AuthService.currentUser?.id;
    if (userId == null) {
      if (mounted) setState(() => _isLoading = false);
      return;
    }

    setState(() => _isLoading = true);
    final posts = await PostService.getSavedPosts(userId);
    if (mounted) {
      setState(() {
        _savedPosts = posts;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFFD32F2F)),
      );
    }

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 24, 16, 16),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD32F2F).withAlpha(25),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: const Icon(Icons.bookmark, color: Color(0xFFD32F2F), size: 28),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Bài viết đã lưu',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Xem lại những nội dung bạn đã lưu lại để đọc sau',
                      style: TextStyle(
                        color: Theme.of(context).colorScheme.onSurface.withAlpha(150),
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
                ),
              ],
            ),
          ),
          Expanded(
            child: _savedPosts.isEmpty
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Theme.of(context).cardColor,
                            shape: BoxShape.circle,
                          ),
                          child: Icon(
                            Icons.bookmark_border,
                            size: 48,
                            color: Theme.of(context).colorScheme.onSurface.withAlpha(70),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Text(
                          'Chưa có bài viết nào',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 8),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 40),
                          child: Text(
                            'Bạn chưa lưu bài viết nào. Hãy khám phá trang chủ và lưu lại những nội dung thú vị nhé!',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface.withAlpha(150),
                              height: 1.5,
                            ),
                          ),
                        ),
                      ],
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: _fetchSavedPosts,
                    child: ListView.builder(
                      padding: const EdgeInsets.only(bottom: 24),
                      itemCount: _savedPosts.length,
                      itemBuilder: (context, index) {
                        return PostCard(
                          post: _savedPosts[index],
                          onRefresh: _fetchSavedPosts,
                        );
                      },
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
