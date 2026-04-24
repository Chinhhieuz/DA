import 'package:flutter/material.dart';
import '../models/post.dart';
import '../services/post_service.dart';
import '../screens/post/comment_screen.dart';
import '../screens/profile/profile_screen.dart';
import '../screens/info/report_screen.dart';
import '../screens/home/main_layout.dart';
import '../services/auth_service.dart';
import 'package:timeago/timeago.dart' as timeago;
import '../utils/responsive.dart';
import 'video_player_widget.dart';
import 'package:share_plus/share_plus.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../services/api_constants.dart';

class PostCard extends StatefulWidget {
  final Post post;
  final VoidCallback onRefresh;

  const PostCard({super.key, required this.post, required this.onRefresh});

  @override
  State<PostCard> createState() => _PostCardState();
}

class _PostCardState extends State<PostCard> {
  late Post _currentPost;

  @override
  void initState() {
    super.initState();
    _currentPost = widget.post;
  }

  @override
  void didUpdateWidget(PostCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.post != oldWidget.post) {
      setState(() {
        _currentPost = widget.post;
      });
    }
  }

  Future<void> _handleVote(String action) async {
    // Check if user is logged in
    if (AuthService.currentUser?.id == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng đăng nhập để bình chọn!')),
      );
      return;
    }

    // Check if post is approved
    if (_currentPost.status != 'approved') {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Bài viết này đã bị khóa!')));
      return;
    }

    // Determine if removing (toggle off)
    final isRemoving = _currentPost.userVote == action;

    // Calculate finalAction
    late String finalAction;
    late String? targetVote;

    if (action == 'up') {
      finalAction = isRemoving ? 'unlike' : 'up';
      targetVote = isRemoving ? null : 'up';
    } else {
      finalAction = isRemoving ? 'undislike' : 'down';
      targetVote = isRemoving ? null : 'down';
    }

    // Optimistic Update - Calculate new vote counts
    int newUpvotes = _currentPost.upvotes;
    int newDownvotes = _currentPost.downvotes;

    if (action == 'up') {
      if (isRemoving) {
        newUpvotes = (newUpvotes - 1).clamp(0, double.infinity).toInt();
      } else {
        newUpvotes++;
        if (_currentPost.userVote == 'down') {
          newDownvotes = (newDownvotes - 1).clamp(0, double.infinity).toInt();
        }
      }
    } else {
      if (isRemoving) {
        newDownvotes = (newDownvotes - 1).clamp(0, double.infinity).toInt();
      } else {
        newDownvotes++;
        if (_currentPost.userVote == 'up') {
          newUpvotes = (newUpvotes - 1).clamp(0, double.infinity).toInt();
        }
      }
    }

    // Store old state for rollback
    final oldPost = _currentPost;

    // Apply optimistic update
    setState(() {
      _currentPost = _currentPost.copyWith(
        upvotes: newUpvotes,
        downvotes: newDownvotes,
        userVote: targetVote,
      );
    });

    // Call API
    final updatedPost = await PostService.votePost(
      _currentPost.id,
      finalAction,
    );

    debugPrint(
      '[POST CARD] 🔍 Vote Response: userVote=${updatedPost?.userVote}, upvotes=${updatedPost?.upvotes}, downvotes=${updatedPost?.downvotes}',
    );

    if (!mounted) return;

    if (updatedPost != null) {
      setState(() {
        _currentPost = _currentPost.copyWith(
          authorId: updatedPost.authorId.isNotEmpty
              ? updatedPost.authorId
              : oldPost.authorId,
          authorName: updatedPost.authorName ?? oldPost.authorName,
          authorAvatar: updatedPost.authorAvatar ?? oldPost.authorAvatar,
          upvotes: updatedPost.upvotes,
          downvotes: updatedPost.downvotes,
          commentsCount: updatedPost.commentsCount,
          createdAt: updatedPost.createdAt,
          userVote: updatedPost.userVote ?? targetVote,
          timestamp: updatedPost.timestamp ?? oldPost.timestamp,
        );
      });
    } else {
      // Revert on failure
      setState(() {
        _currentPost = oldPost;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không thể lưu bình chọn. Vui lòng thử lại!'),
        ),
      );
    }
  }

  void _handleShare() {
    final String postUrl =
        '${ApiConstants.baseUrl.replaceAll('/api', '')}/?view=post&id=${_currentPost.id}';
    Share.share(
      'Xem bài viết này trên Linky: ${_currentPost.title}\n$postUrl',
      subject: _currentPost.title,
    );
  }

  void _copyLink() {
    final String postUrl =
        '${ApiConstants.baseUrl.replaceAll('/api', '')}/?view=post&id=${_currentPost.id}';
    Clipboard.setData(ClipboardData(text: postUrl));
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('Đã sao chép liên kết vào bộ nhớ tạm'),
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _showCommentModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      backgroundColor: Colors.transparent,
      builder: (context) => ClipRRect(
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        child: CommentScreen(post: _currentPost),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final community = _currentPost.community;
    final author = _currentPost.authorName ?? 'Ẩn danh';
    final timeMsg =
        _currentPost.timestamp ??
        timeago.format(_currentPost.createdAt, locale: 'vi');

    return GestureDetector(
      onTap: _showCommentModal,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16, left: 12, right: 12),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: Theme.of(
              context,
            ).dividerColor.withValues(alpha: 0.7),
          ),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF0F172A).withValues(alpha: 0.08),
              blurRadius: 60,
              offset: const Offset(0, 24),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(
                16.sp(context),
                16.sp(context),
                16.sp(context),
                12.sp(context),
              ),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Avatar with border
                  GestureDetector(
                    onTap: () {
                      final mainLayout = MainLayout.of(context);
                      if (mainLayout != null) {
                        mainLayout.setViewingProfile(_currentPost.authorId);
                      } else {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (_) =>
                                ProfileScreen(userId: _currentPost.authorId),
                          ),
                        );
                      }
                    },
                    child: Container(
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.6),
                          width: 1,
                        ),
                        boxShadow: [
                          BoxShadow(
                            color: Colors.black.withValues(alpha: 0.1),
                            blurRadius: 4,
                            spreadRadius: 2,
                          ),
                        ],
                      ),
                      child: Container(
                        padding: const EdgeInsets.all(
                          2,
                        ), // Inner spacing for ring
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(
                            color: Colors.white.withValues(alpha: 0.4),
                            width: 4,
                          ),
                        ),
                        child: CircleAvatar(
                          radius: 20.sp(context),
                          backgroundColor: Theme.of(context).cardColor,
                          backgroundImage: _currentPost.fullAuthorAvatar != null
                              ? NetworkImage(_currentPost.fullAuthorAvatar!)
                              : null,
                          child: _currentPost.fullAuthorAvatar == null
                              ? Text(
                                  _currentPost.authorName
                                          ?.substring(0, 1)
                                          .toUpperCase() ??
                                      'U',
                                  style: TextStyle(
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.onSurface,
                                    fontWeight: FontWeight.bold,
                                  ),
                                )
                              : null,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Wrap(
                          crossAxisAlignment: WrapCrossAlignment.center,
                          spacing: 4,
                          runSpacing: 2,
                          children: [
                            GestureDetector(
                              onTap: () {
                                final mainLayout = MainLayout.of(context);
                                if (mainLayout != null) {
                                  mainLayout.setViewingProfile(
                                    _currentPost.authorId,
                                  );
                                } else {
                                  Navigator.of(context).push(
                                    MaterialPageRoute(
                                      builder: (_) => ProfileScreen(
                                        userId: _currentPost.authorId,
                                      ),
                                    ),
                                  );
                                }
                              },
                              child: Text(
                                author,
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 14.sp(context),
                                  color: Theme.of(
                                    context,
                                  ).colorScheme.onSurface,
                                ),
                              ),
                            ),
                            Text(
                              '• $timeMsg',
                              style: TextStyle(
                                fontSize: 11.sp(context),
                                color: Theme.of(context).colorScheme.onSurface
                                    .withValues(alpha: 0.5),
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: const Color(
                                  0xFFC91F28,
                                ).withAlpha((0.1 * 255).round()),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    (community ?? 'Chung'),
                                    style: TextStyle(
                                      color: const Color(0xFFC91F28),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 12.sp(context),
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    maxLines: 1,
                                  ),
                                ],
                              ),
                            ),
                            if (_currentPost.status != 'approved') ...[
                              const SizedBox(width: 6),
                              _buildStatusBadge(_currentPost.status),
                            ],
                          ],
                        ),
                      ],
                    ),
                  ),

                  // Follow Button
                  if (_currentPost.authorId != AuthService.currentUser?.id)
                    Padding(
                      padding: const EdgeInsets.only(right: 0.0),
                      child: Container(
                        height: 36,
                        decoration: BoxDecoration(
                          color: _currentPost.isFollowingAuthor
                              ? Colors.grey.withAlpha((0.1 * 255).round())
                              : const Color(
                                  0xFFC91F28,
                                ).withAlpha((0.08 * 255).round()),
                          borderRadius: BorderRadius.circular(24),
                        ),
                        child: TextButton.icon(
                          style: TextButton.styleFrom(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 0,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(24),
                            ),
                          ),
                          onPressed: () async {
                            final isFollowing = _currentPost.isFollowingAuthor;
                            setState(() {
                              // Optimistic Update wrapper...
                              _currentPost = _currentPost.copyWith(isFollowingAuthor: !isFollowing);
                            });

                            final result = isFollowing
                                ? await AuthService.unfollowUser(
                                    _currentPost.authorId,
                                  )
                                : await AuthService.followUser(
                                    _currentPost.authorId,
                                  );

                            if (!result['success']) {
                              // Revert on failure
                              setState(() {
                                _currentPost = _currentPost.copyWith(isFollowingAuthor: isFollowing);
                              });
                            }
                          },
                          icon: Icon(
                            _currentPost.isFollowingAuthor
                                ? Icons.check
                                : Icons.person_add_outlined,
                            size: 14,
                            color: _currentPost.isFollowingAuthor
                                ? Colors.grey.shade600
                                : Colors.red.shade600,
                          ),
                          label: Text(
                            _currentPost.isFollowingAuthor
                                ? 'Đã theo dõi'
                                : 'Theo dõi',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: _currentPost.isFollowingAuthor
                                  ? Colors.grey.shade600
                                  : Colors.red.shade600,
                            ),
                          ),
                        ),
                      ),
                    ),

                  PopupMenuButton<String>(
                    icon: Icon(
                      Icons.more_horiz,
                      color: Theme.of(
                        context,
                      ).colorScheme.onSurface.withAlpha((0.45 * 255).round()),
                      size: 22,
                    ),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                    onSelected: (v) async {
                      final messenger = ScaffoldMessenger.of(context);
                      final navigator = Navigator.of(context);

                      if (v == 'report') {
                        navigator.push(
                          MaterialPageRoute(
                            builder: (_) => ReportScreen(post: _currentPost),
                          ),
                        );
                      } else if (v == 'copy_link') {
                        _copyLink();
                      } else if (v == 'save') {
                        final isSaved = _currentPost.isSaved;
                        setState(() {
                          _currentPost = _currentPost.copyWith(isSaved: !isSaved);
                        });

                        final newSavedState = await PostService.toggleSavePost(
                          _currentPost.id,
                        );
                        if (context.mounted) {
                          if (newSavedState != null) {
                            setState(() {
                              // Update currentPost to reflect the TRUE state returned from backend
                              _currentPost = _currentPost.copyWith(isSaved: newSavedState);
                            });
                            messenger.showSnackBar(
                              SnackBar(
                                content: Text(
                                  newSavedState
                                      ? 'Đã lưu bài viết'
                                      : 'Đã hủy lưu bài viết',
                                ),
                              ),
                            );
                          } else {
                            // Revert on failure
                            setState(() {
                              _currentPost = _currentPost.copyWith(isSaved: isSaved);
                            });
                          }
                        }
                      } else if (v == 'delete') {
                        final confirm = await showDialog<bool>(
                          context: context,
                          builder: (ctx) => AlertDialog(
                            title: const Text('Xóa bài viết'),
                            content: const Text(
                              'Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác.',
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.of(ctx).pop(false),
                                child: const Text('Hủy'),
                              ),
                              TextButton(
                                onPressed: () => Navigator.of(ctx).pop(true),
                                child: const Text(
                                  'Xóa',
                                  style: TextStyle(color: Colors.red),
                                ),
                              ),
                            ],
                          ),
                        );
                        if (confirm == true) {
                          final success = await PostService.deletePost(
                            _currentPost.id,
                          );
                          if (!mounted) return;
                          if (success) {
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text('Đã xóa bài viết thành công!'),
                              ),
                            );
                            widget.onRefresh();
                          } else {
                            messenger.showSnackBar(
                              const SnackBar(
                                content: Text(
                                  'Không thể xóa bài viết. Vui lòng thử lại.',
                                ),
                              ),
                            );
                          }
                        }
                      }
                    },
                    offset: const Offset(0, 32),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                    itemBuilder: (ctx) => [
                      PopupMenuItem(
                        value: 'save',
                        child: Row(
                          children: [
                            Icon(
                              _currentPost.isSaved
                                  ? Icons.bookmark
                                  : Icons.bookmark_outline,
                              size: 18,
                              color: _currentPost.isSaved
                                  ? const Color(0xFFD32F2F)
                                  : null,
                            ),
                            const SizedBox(width: 10),
                            Text(
                              _currentPost.isSaved
                                  ? 'Hủy lưu bài viết'
                                  : 'Lưu bài viết',
                              style: TextStyle(
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                          ],
                        ),
                      ),
                      PopupMenuItem(
                        value: 'report',
                        child: Row(
                          children: [
                            const Icon(
                              Icons.flag_outlined,
                              size: 18,
                              color: Colors.red,
                            ),
                            const SizedBox(width: 10),
                            const Text(
                              'Báo cáo',
                              style: TextStyle(color: Colors.red),
                            ),
                          ],
                        ),
                      ),
                      if (_currentPost.authorId == AuthService.currentUser?.id)
                        const PopupMenuItem(
                          value: 'delete',
                          child: Row(
                            children: [
                              Icon(
                                Icons.delete_outline,
                                size: 18,
                                color: Colors.red,
                              ),
                              SizedBox(width: 10),
                              Text(
                                'Xóa bài viết',
                                style: TextStyle(color: Colors.red),
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ],
              ),
            ),

            // Title
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.sp(context)),
              child: Text(
                _currentPost.plainTitle,
                style: TextStyle(
                  fontSize: 22.sp(context),
                  fontWeight: FontWeight.w900,
                  height: 1.2,
                  color: Theme.of(context).colorScheme.onSurface,
                  letterSpacing: -0.5,
                ),
              ),
            ),

            // Content text
            const SizedBox(height: 8),
            Padding(
              padding: EdgeInsets.symmetric(horizontal: 16.sp(context)),
              child: Text(
                _currentPost.plainContent,
                style: TextStyle(
                  fontSize: 14.sp(context),
                  color: Theme.of(
                    context,
                  ).colorScheme.onSurface.withAlpha((0.85 * 255).round()),
                  height: 1.6,
                ),
                maxLines: 4,
                overflow: TextOverflow.ellipsis,
              ),
            ),

            // Multi-image or Single image
            _buildImageContent(),

            if (_currentPost.recentComment != null) ...[_buildRecentComment()],

            // Reaction Summary Labels
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      if (_currentPost.upvotes > 0)
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.orange.shade50.withAlpha(
                              (0.1 * 255).round(),
                            ),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Colors.orange.shade100.withAlpha(
                                (0.2 * 255).round(),
                              ),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.arrow_upward_rounded,
                                color: Colors.orange,
                                size: 12,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${_currentPost.upvotes}',
                                style: TextStyle(
                                  color: Colors.orange,
                                  fontSize: 11.sp(context),
                                  fontWeight: FontWeight.bold,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (_currentPost.downvotes > 0) ...[
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 2,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50.withAlpha(
                              (0.1 * 255).round(),
                            ),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(
                              color: Colors.blue.shade100.withAlpha(
                                (0.2 * 255).round(),
                              ),
                            ),
                          ),
                          child: Row(
                            children: [
                              const Icon(
                                Icons.arrow_downward_rounded,
                                color: Colors.blue,
                                size: 12,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '${_currentPost.downvotes}',
                                style: TextStyle(
                                  color: Colors.blue,
                                  fontSize: 11.sp(context),
                                  fontWeight: FontWeight.bold,
                                  fontStyle: FontStyle.italic,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                  if (_currentPost.commentsCount > 0)
                    GestureDetector(
                      onTap: _showCommentModal,
                      child: Text(
                        '${_currentPost.commentsCount} Bình luận',
                        style: TextStyle(
                          fontSize: 11.sp(context),
                          color: Theme.of(context).colorScheme.onSurface
                              .withAlpha((0.6 * 255).round()),
                        ),
                      ),
                    ),
                ],
              ),
            ),

            // Divider
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Divider(
                height: 1,
                thickness: 1,
                color: Theme.of(
                  context,
                ).dividerColor.withAlpha((0.8 * 255).round()),
              ),
            ),

            // Action Row
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              child: Wrap(
                spacing: 8.0,
                runSpacing: 8.0,
                crossAxisAlignment: WrapCrossAlignment.center,
                children: [
                  // Upvote/Downvote pill
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 4,
                      vertical: 2,
                    ),
                    decoration: BoxDecoration(
                      color: Theme.of(context).cardColor,
                      borderRadius: BorderRadius.circular(24),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Row(
                      children: [
                        InkWell(
                          onTap: () => _handleVote('up'),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: _currentPost.userVote == 'up'
                                  ? Colors.orange.shade50
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.arrow_upward_rounded,
                                  size: _currentPost.userVote == 'up'
                                      ? 22.sp(context)
                                      : 18.sp(context),
                                  color: _currentPost.userVote == 'up'
                                      ? Colors.orange.shade600
                                      : Colors.grey.shade500,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '${_currentPost.upvotes}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13.sp(context),
                                    color: _currentPost.userVote == 'up'
                                        ? Colors.orange.shade600
                                        : Colors.grey.shade500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        Container(
                          width: 1,
                          height: 16,
                          color: Theme.of(context).dividerColor,
                          margin: const EdgeInsets.symmetric(horizontal: 4),
                        ),
                        InkWell(
                          onTap: () => _handleVote('down'),
                          borderRadius: BorderRadius.circular(20),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 6,
                            ),
                            decoration: BoxDecoration(
                              color: _currentPost.userVote == 'down'
                                  ? Colors.blue.shade50
                                  : Colors.transparent,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.arrow_downward_rounded,
                                  size: _currentPost.userVote == 'down'
                                      ? 22.sp(context)
                                      : 18.sp(context),
                                  color: _currentPost.userVote == 'down'
                                      ? Colors.blue.shade600
                                      : Colors.grey.shade500,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  '${_currentPost.downvotes}',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13.sp(context),
                                    color: _currentPost.userVote == 'down'
                                        ? Colors.blue.shade600
                                        : Colors.grey.shade500,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Comments Button
                  Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.light
                          ? const Color(
                              0xFFC91F28,
                            ).withAlpha((0.1 * 255).round())
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: TextButton.icon(
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 0,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                      onPressed: _showCommentModal,
                      icon: Icon(
                        Icons.chat_bubble_outline_rounded,
                        size: 16,
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                      ),
                      label: Text(
                        'Bình luận',
                        style: TextStyle(
                          fontSize: 12.sp(context),
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onSurface
                              .withAlpha((0.6 * 255).round()),
                        ),
                      ),
                    ),
                  ),
                  // Share Button
                  Container(
                    decoration: BoxDecoration(
                      color: Theme.of(context).brightness == Brightness.light
                          ? Colors.green.shade50
                          : Colors.transparent,
                      borderRadius: BorderRadius.circular(24),
                    ),
                    child: TextButton.icon(
                      style: TextButton.styleFrom(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 0,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                      onPressed: _handleShare,
                      icon: Icon(
                        Icons.share_outlined,
                        size: 16,
                        color: Colors.green.shade600,
                      ),
                      label: Text(
                        'Chia sẻ',
                        style: TextStyle(
                          fontSize: 12.sp(context),
                          fontWeight: FontWeight.bold,
                          color: Colors.green.shade600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color bgColor;
    Color textColor;
    String label;

    switch (status) {
      case 'pending':
        bgColor = const Color(0xFFFFF7ED);
        textColor = const Color(0xFFC2410C);
        label = 'CHỜ DUYỆT';
        break;
      case 'rejected':
        bgColor = const Color(0xFFFEF2F2);
        textColor = const Color(0xFFB91C1C);
        label = 'BỊ TỪ CHỐI';
        break;
      case 'hidden':
        bgColor = const Color(0xFFF8FAFC);
        textColor = const Color(0xFF64748B);
        label = 'BỊ ẨN';
        break;
      default:
        return const SizedBox.shrink();
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: textColor.withAlpha(50)),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: textColor,
          fontWeight: FontWeight.bold,
          fontSize: 9,
        ),
      ),
    );
  }

  Widget _buildImageContent() {
    final hasImages = _currentPost.imageUrls.isNotEmpty;
    final hasSingleImage =
        _currentPost.imageUrl != null && _currentPost.imageUrl!.isNotEmpty;
    final hasVideo =
        _currentPost.videoUrl != null && _currentPost.videoUrl!.isNotEmpty;

    if (!hasImages && !hasSingleImage && !hasVideo) {
      return const SizedBox.shrink();
    }

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 12, 12, 4),
      child: Column(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(12),
            child: hasVideo
                ? VideoPlayerWidget(videoUrl: _currentPost.fullVideoUrl!)
                : (hasImages
                      ? _buildImageCollage(_currentPost.fullImageUrls)
                      : Image.network(
                          _currentPost.fullImageUrl ?? '',
                          width: double.infinity,
                          height: 250.sp(context),
                          fit: BoxFit.cover,
                          errorBuilder: (_, _, _) => _buildImageError(),
                        )),
          ),
          if (_currentPost.attachments.isNotEmpty) _buildAttachments(),
        ],
      ),
    );
  }

  Widget _buildImageCollage(List<String> urls) {
    if (urls.isEmpty) return const SizedBox.shrink();
    if (urls.length == 1) {
      return Image.network(
        urls[0],
        width: double.infinity,
        height: 280,
        fit: BoxFit.cover,
        errorBuilder: (_, _, _) => _buildImageError(),
      );
    }

    if (urls.length == 2) {
      return SizedBox(
        height: 200,
        child: Row(
          children: [
            Expanded(
              child: Image.network(
                urls[0],
                height: 200,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => _buildImageError(),
              ),
            ),
            const SizedBox(width: 2),
            Expanded(
              child: Image.network(
                urls[1],
                height: 200,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => _buildImageError(),
              ),
            ),
          ],
        ),
      );
    }

    if (urls.length == 3) {
      return SizedBox(
        height: 300,
        child: Column(
          children: [
            Expanded(
              child: Image.network(
                urls[0],
                width: double.infinity,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => _buildImageError(),
              ),
            ),
            const SizedBox(height: 2),
            Expanded(
              child: Row(
                children: [
                  Expanded(
                    child: Image.network(
                      urls[1],
                      height: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => _buildImageError(),
                    ),
                  ),
                  const SizedBox(width: 2),
                  Expanded(
                    child: Image.network(
                      urls[2],
                      height: double.infinity,
                      fit: BoxFit.cover,
                      errorBuilder: (_, _, _) => _buildImageError(),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      );
    }

    // 4 or more
    return SizedBox(
      height: 300,
      child: Column(
        children: [
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Image.network(
                    urls[0],
                    height: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _buildImageError(),
                  ),
                ),
                const SizedBox(width: 2),
                Expanded(
                  child: Image.network(
                    urls[1],
                    height: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _buildImageError(),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 2),
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: Image.network(
                    urls[2],
                    height: double.infinity,
                    fit: BoxFit.cover,
                    errorBuilder: (_, _, _) => _buildImageError(),
                  ),
                ),
                const SizedBox(width: 2),
                Expanded(
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      Image.network(
                        urls[3],
                        height: double.infinity,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => _buildImageError(),
                      ),
                      if (urls.length > 4)
                        Container(
                          color: Colors.black.withAlpha(120),
                          child: Center(
                            child: Text(
                              '+${urls.length - 4}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildImageError() {
    return Container(
      color: Colors.grey.shade100,
      child: const Center(
        child: Icon(Icons.image_not_supported, color: Colors.grey),
      ),
    );
  }

  Widget _buildRecentComment() {
    final comment = _currentPost.recentComment!;
    final authorName = comment['authorName'] ?? 'Người dùng';
    final content = _currentPost.recentCommentContent ?? '';

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: GestureDetector(
        onTap: () {
          _showCommentModal();
        },
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Theme.of(context).brightness == Brightness.light
                ? Colors.grey.shade50
                : const Color(0xFF1E293B),
            borderRadius: BorderRadius.circular(12),
          ),
          child: RichText(
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            text: TextSpan(
              style: TextStyle(
                fontSize: 13,
                color: Theme.of(context).colorScheme.onSurface.withAlpha(200),
              ),
              children: [
                TextSpan(
                  text: '$authorName: ',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                TextSpan(text: content),
              ],
            ),
          ),
        ),
      ),
    );
  }
  Widget _buildAttachments() {
    return Padding(
      padding: const EdgeInsets.only(top: 8.0),
      child: Column(
        children: _currentPost.attachments.map((attachment) {
          final String name = attachment['name'] ?? 'Tệp đính kèm';
          final String url = attachment['url'] ?? '';
          final int? size = attachment['size'];
          
          return Padding(
            padding: const EdgeInsets.only(bottom: 6.0),
            child: InkWell(
              onTap: () async {
                final uri = Uri.parse(url);
                if (await canLaunchUrl(uri)) {
                  await launchUrl(uri, mode: LaunchMode.externalApplication);
                }
              },
              borderRadius: BorderRadius.circular(10),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(10),
                  border: Border.all(color: Theme.of(context).dividerColor.withAlpha(51)),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.insert_drive_file_rounded, color: Color(0xFFD32F2F), size: 18),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                          if (size != null)
                            Text(
                              _formatFileSize(size),
                              style: const TextStyle(fontSize: 10, color: Colors.grey),
                            ),
                        ],
                      ),
                    ),
                    const Icon(Icons.open_in_new_rounded, size: 14, color: Colors.grey),
                  ],
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }

  String _formatFileSize(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
}
