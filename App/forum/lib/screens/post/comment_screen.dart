import 'dart:io' as io;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/post.dart';
import '../../models/comment.dart' as model;
import '../../services/comment_service.dart';
import '../../services/auth_service.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'package:share_plus/share_plus.dart';
import 'package:flutter/services.dart';
import '../../services/api_constants.dart';
import '../../widgets/video_player_widget.dart';
import '../../services/post_service.dart';
import 'package:flutter/foundation.dart' show kIsWeb;
import '../home/main_layout.dart';

class CommentScreen extends StatefulWidget {
  final Post post;

  const CommentScreen({super.key, required this.post});

  @override
  State<CommentScreen> createState() => _CommentScreenState();
}

class _CommentScreenState extends State<CommentScreen> {
  final _commentController = TextEditingController();
  List<model.Comment> _comments = [];
  bool _isLoading = true;
  String? _error;
  model.Comment? _replyingToComment;
  XFile? _selectedImage;
  late Post _currentPost;
  final ImagePicker _picker = ImagePicker();

  @override
  void initState() {
    super.initState();
    _currentPost = widget.post;
    _fetchComments();
  }

  Future<void> _fetchComments() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final comments = await CommentService.getCommentsByPost(widget.post.id);
      if (mounted) {
        setState(() {
          _comments = comments;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = 'Không thể tải bình luận: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _pickImage() async {
    final XFile? image = await _picker.pickImage(source: ImageSource.gallery);
    if (image != null) {
      if (mounted) setState(() => _selectedImage = image);
    }
  }

  void _removeImage() {
    setState(() => _selectedImage = null);
  }

  String _getRootCommentId(String id) {
    for (var c in _comments) {
      if (c.id == id) return c.id;
      if (c.replies.any((r) => r.id == id)) return c.id;
    }
    return id;
  }

  void _handleSendComment() async {
    final text = _commentController.text.trim();
    if (text.isEmpty && _selectedImage == null) return;

    final result = _replyingToComment == null
        ? await CommentService.createComment(
            postId: widget.post.id,
            content: text,
            imageFile: _selectedImage,
          )
        : await CommentService.createReply(
            commentId: _getRootCommentId(_replyingToComment!.id),
            content: text,
          );

    if (mounted) {
      if (result['success']) {
        _commentController.clear();
        setState(() {
          _replyingToComment = null;
          _selectedImage = null;
        });
        _fetchComments(); // Refresh list
      } else {
        ScaffoldMessenger.of(
          context,
        ).showSnackBar(SnackBar(content: Text(result['message'])));
      }
    }
  }

  Future<void> _handleVoteComment(
    model.Comment targetComment,
    String action,
    bool isThread,
  ) async {
    String? finalAction = action;
    int newUpvotes = targetComment.upvotes;
    int newDownvotes = targetComment.downvotes;
    String? newVote;

    if (action == 'up') {
      if (targetComment.userVote == 'up') {
        newUpvotes--;
        finalAction = 'unlike';
      } else {
        newUpvotes++;
        if (targetComment.userVote == 'down') newDownvotes--;
        newVote = 'up';
      }
    } else {
      if (targetComment.userVote == 'down') {
        newDownvotes--;
        finalAction = 'undislike';
      } else {
        newDownvotes++;
        if (targetComment.userVote == 'up') newUpvotes--;
        newVote = 'down';
      }
    }

    model.Comment newComment = model.Comment(
      id: targetComment.id,
      content: targetComment.content,
      authorId: targetComment.authorId,
      authorName: targetComment.authorName,
      authorAvatar: targetComment.authorAvatar,
      postId: targetComment.postId,
      postTitle: targetComment.postTitle,
      upvotes: newUpvotes,
      downvotes: newDownvotes,
      userVote: newVote,
      imageUrl: targetComment.imageUrl,
      createdAt: targetComment.createdAt,
      replies: targetComment.replies,
    );

    model.Comment updateCommentTree(model.Comment current) {
      if (current.id == targetComment.id) return newComment;
      return model.Comment(
        id: current.id,
        content: current.content,
        authorId: current.authorId,
        authorName: current.authorName,
        authorAvatar: current.authorAvatar,
        postId: current.postId,
        postTitle: current.postTitle,
        upvotes: current.upvotes,
        downvotes: current.downvotes,
        userVote: current.userVote,
        imageUrl: current.imageUrl,
        createdAt: current.createdAt,
        replies: current.replies
            .map((reply) => updateCommentTree(reply))
            .toList(),
      );
    }

    setState(() {
      _comments = _comments.map((c) => updateCommentTree(c)).toList();
    });

    final success = await CommentService.voteComment(
      targetId: targetComment.id,
      action: finalAction,
      targetType: isThread ? 'threads' : 'comments',
    );

    if (!success && mounted) {
      _fetchComments(); // Revert on failure
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lỗi khi bình chọn. Vui lòng thử lại.')),
      );
    }
  }

  void _handleShare() {
    final String postUrl =
        '${ApiConstants.baseUrl.replaceAll('/api', '')}/?view=post&id=${widget.post.id}';
    Share.share(
      'Xem bài viết này trên Linky: ${widget.post.title}\n$postUrl',
      subject: widget.post.title,
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

  @override
  void dispose() {
    _commentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).scaffoldBackgroundColor,
        elevation: 0,
        leading: IconButton(
          icon: Icon(
            Icons.close,
            color: Theme.of(context).colorScheme.onSurface,
          ),
          onPressed: () => Navigator.of(context).pop(),
        ),
        centerTitle: true,
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 12,
              backgroundColor: Colors.grey.shade200,
              child: const Icon(Icons.group, size: 14, color: Colors.black54),
            ),
            const SizedBox(width: 8),
            Text(
              widget.post.community ?? 'r/Cộngđồng',
              style: TextStyle(
                color: Theme.of(context).colorScheme.onSurface,
                fontWeight: FontWeight.bold,
                fontSize: 16,
              ),
            ),
          ],
        ),
        actions: [
          PopupMenuButton<String>(
            icon: Icon(
              Icons.more_horiz,
              color: Theme.of(context).colorScheme.onSurface,
            ),
            onSelected: (value) async {
              if (value == 'save') {
                final isSaved = _currentPost.isSaved;
                setState(() {
                  _currentPost = _currentPost.copyWith(isSaved: !isSaved);
                });
                
                final result = await PostService.toggleSavePost(_currentPost.id);
                if (result != null) {
                  if (context.mounted) {
                    setState(() {
                      _currentPost = _currentPost.copyWith(isSaved: result);
                    });
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(result ? 'Đã lưu bài viết' : 'Đã bỏ lưu bài viết')),
                    );
                  }
                } else {
                  if (mounted) {
                    setState(() {
                      _currentPost = _currentPost.copyWith(isSaved: isSaved);
                    });
                  }
                }
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'save',
                child: Row(
                  children: [
                    Icon(
                      _currentPost.isSaved ? Icons.bookmark : Icons.bookmark_border,
                      size: 20,
                      color: _currentPost.isSaved ? const Color(0xFFD32F2F) : null,
                    ),
                    const SizedBox(width: 12),
                    Text(_currentPost.isSaved ? 'Bỏ lưu bài viết' : 'Lưu bài viết'),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView(
              children: [
                // Post summary card
                Container(
                  color: Theme.of(context).cardColor,
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Community + author
                      Row(
                        children: [
                          GestureDetector(
                            onTap: () {
                              Navigator.pop(context); // Close comment screen
                              MainLayout.of(context)?.setViewingProfile(widget.post.authorId);
                            },
                            child: CircleAvatar(
                              radius: 16,
                              backgroundColor: const Color(0xFFD32F2F),
                              backgroundImage:
                                  widget.post.fullAuthorAvatar != null
                                  ? NetworkImage(widget.post.fullAuthorAvatar!)
                                  : null,
                              child: widget.post.fullAuthorAvatar == null
                                  ? Text(
                                      (widget.post.authorName ?? 'U')
                                          .substring(0, 1)
                                          .toUpperCase(),
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                      ),
                                    )
                                  : null,
                            ),
                          ),
                          const SizedBox(width: 10),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                children: [
                                  GestureDetector(
                                    onTap: () {
                                      Navigator.pop(context);
                                      MainLayout.of(context)?.setViewingProfile(widget.post.authorId);
                                    },
                                    child: Text(
                                      widget.post.authorName ?? 'Ẩn danh',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                        color: Theme.of(
                                          context,
                                        ).colorScheme.onSurface,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 6),
                                  Text(
                                    '• ${widget.post.timestamp ?? timeago.format(widget.post.createdAt, locale: 'vi')}',
                                    style: TextStyle(
                                      fontSize: 13,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withAlpha((0.6 * 255).round()),
                                    ),
                                  ),
                                ],
                              ),
                              if (widget.post.authorId ==
                                  'admin') // Mock flair handling
                                Text(
                                  'Quản trị viên',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.blue.shade600,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      const SizedBox(height: 12),
                      // Post title
                      Text(
                        widget.post.plainTitle,
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).colorScheme.onSurface,
                          height: 1.3,
                        ),
                      ),
                      // Post content
                      if (widget.post.plainContent.isNotEmpty) ...[
                        const SizedBox(height: 10),
                        Text(
                          widget.post.plainContent,
                          style: TextStyle(
                            fontSize: 15,
                            color: Theme.of(context).colorScheme.onSurface,
                            height: 1.5,
                          ),
                        ),
                      ],
                      // Post image
                      if (widget.post.fullImageUrl != null) ...[
                        const SizedBox(height: 16),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(16),
                          child: Image.network(
                            widget.post.fullImageUrl!,
                            width: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (ctx, err, stack) =>
                                const SizedBox.shrink(),
                          ),
                        ),
                      ],
                      // Post video
                      if (widget.post.fullVideoUrl != null) ...[
                        const SizedBox(height: 16),
                        VideoPlayerWidget(
                          videoUrl: widget.post.fullVideoUrl!,
                          autoPlay: true,
                          looping: true,
                          muted: false,
                        ),
                      ],
                      const SizedBox(height: 12),
                      // Action row
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 4,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(24),
                              border: Border.all(
                                color: Theme.of(context).dividerColor,
                              ),
                            ),
                            child: Row(
                              children: [
                                InkWell(
                                  onTap: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Vui lòng bình chọn bài viết ở trang chủ',
                                        ),
                                      ),
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(20),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: widget.post.userVote == 'up'
                                          ? Colors.orange.shade50
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.arrow_upward_rounded,
                                          size: 18,
                                          color: widget.post.userVote == 'up'
                                              ? Colors.orange.shade600
                                              : Colors.grey.shade500,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${widget.post.upvotes}',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                            color: widget.post.userVote == 'up'
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
                                  margin: const EdgeInsets.symmetric(
                                    horizontal: 4,
                                  ),
                                ),
                                InkWell(
                                  onTap: () {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text(
                                          'Vui lòng bình chọn bài viết ở trang chủ',
                                        ),
                                      ),
                                    );
                                  },
                                  borderRadius: BorderRadius.circular(20),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 6,
                                    ),
                                    decoration: BoxDecoration(
                                      color: widget.post.userVote == 'down'
                                          ? Colors.blue.shade50
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Row(
                                      children: [
                                        Icon(
                                          Icons.arrow_downward_rounded,
                                          size: 18,
                                          color: widget.post.userVote == 'down'
                                              ? Colors.blue.shade600
                                              : Colors.grey.shade500,
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${widget.post.downvotes}',
                                          style: TextStyle(
                                            fontWeight: FontWeight.bold,
                                            fontSize: 13,
                                            color:
                                                widget.post.userVote == 'down'
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
                          const SizedBox(width: 8),
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: Theme.of(
                                  context,
                                ).dividerColor.withAlpha((0.5 * 255).round()),
                              ),
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(24),
                              onTap: () {},
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 8,
                                ),
                                child: Row(
                                  children: [
                                    Icon(
                                      Icons.chat_bubble_outline_rounded,
                                      size: 18,
                                      color: Theme.of(context)
                                          .colorScheme
                                          .onSurface
                                          .withAlpha((0.7 * 255).round()),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      '${widget.post.commentsCount}',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                        color: Theme.of(
                                          context,
                                        ).colorScheme.onSurface,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Container(
                            decoration: BoxDecoration(
                              border: Border.all(
                                color: Theme.of(
                                  context,
                                ).dividerColor.withAlpha((0.5 * 255).round()),
                              ),
                              borderRadius: BorderRadius.circular(24),
                            ),
                            child: InkWell(
                              borderRadius: BorderRadius.circular(24),
                              onTap: _handleShare,
                              onLongPress: _copyLink,
                              child: Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 14,
                                  vertical: 8,
                                ),
                                child: Icon(
                                  Icons.share_outlined,
                                  size: 18,
                                  color: Theme.of(context).colorScheme.onSurface
                                      .withAlpha((0.7 * 255).round()),
                                ),
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 8),

                // Sort bar
                Container(
                  color: Theme.of(context).cardColor,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                  child: Row(
                    children: [
                      Icon(
                        Icons.sort,
                        size: 18,
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Phổ biến nhất',
                        style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context).colorScheme.onSurface
                              .withAlpha((0.7 * 255).round()),
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      Icon(
                        Icons.keyboard_arrow_down,
                        size: 18,
                        color: Theme.of(
                          context,
                        ).colorScheme.onSurface.withAlpha((0.4 * 255).round()),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),

                // Comments list
                if (_isLoading)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: CircularProgressIndicator(),
                    ),
                  )
                else if (_error != null)
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.all(20),
                      child: Text(
                        _error!,
                        style: const TextStyle(color: Colors.red),
                      ),
                    ),
                  )
                else if (_comments.isEmpty)
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(20),
                      child: Text('Chưa có bình luận nào.'),
                    ),
                  )
                else
                  ..._comments.map((c) => _buildComment(c)),
              ],
            ),
          ),

          // Comment input bar
          Container(
            padding: const EdgeInsets.fromLTRB(12, 8, 8, 8),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(
                top: BorderSide(color: Theme.of(context).dividerColor),
              ),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_replyingToComment != null)
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 8,
                    ),
                    color: Theme.of(
                      context,
                    ).dividerColor.withAlpha((0.3 * 255).round()),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(
                            'Đang trả lời u/${_replyingToComment!.authorName}',
                            style: TextStyle(
                              fontSize: 12,
                              color: Theme.of(context).colorScheme.primary,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        InkWell(
                          onTap: () =>
                              setState(() => _replyingToComment = null),
                          child: const Icon(Icons.close, size: 16),
                        ),
                      ],
                    ),
                  ),
                if (_selectedImage != null)
                  Padding(
                    padding: const EdgeInsets.all(8.0),
                    child: Stack(
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: kIsWeb
                              ? Image.network(
                                  _selectedImage!.path,
                                  height: 100,
                                  width: 100,
                                  fit: BoxFit.cover,
                                )
                              : Image.file(
                                  io.File(_selectedImage!.path),
                                  height: 100,
                                  width: 100,
                                  fit: BoxFit.cover,
                                ),
                        ),
                        Positioned(
                          top: -4,
                          right: -4,
                          child: IconButton(
                            icon: const Icon(Icons.cancel, color: Colors.red),
                            onPressed: _removeImage,
                          ),
                        ),
                      ],
                    ),
                  ),
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.image, color: Colors.blue),
                        onPressed: _pickImage,
                      ),
                      CircleAvatar(
                        radius: 16,
                        backgroundImage: NetworkImage(
                          AuthService.currentUser?.fullProfilePicture ??
                              'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200',
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextField(
                          controller: _commentController,
                          decoration: InputDecoration(
                            hintText: _replyingToComment == null
                                ? 'Thêm bình luận...'
                                : 'Viết phản hồi...',
                            hintStyle: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface
                                  .withAlpha((0.4 * 255).round()),
                              fontSize: 14,
                            ),
                            filled: true,
                            fillColor: Theme.of(context).dividerColor,
                            contentPadding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 10,
                            ),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(24),
                              borderSide: BorderSide.none,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 6),
                      InkWell(
                        onTap: _handleSendComment,
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: const BoxDecoration(
                            color: Color(0xFFD32F2F),
                            shape: BoxShape.circle,
                          ),
                          child: const Icon(
                            Icons.send,
                            color: Colors.white,
                            size: 18,
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

  Widget _buildComment(model.Comment comment, {int depth = 0}) {
    return Container(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 4),
      decoration: BoxDecoration(
        color: Theme.of(context).scaffoldBackgroundColor,
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              GestureDetector(
                onTap: () {
                  Navigator.pop(context);
                  MainLayout.of(context)?.setViewingProfile(comment.authorId);
                },
                child: CircleAvatar(
                  radius: depth == 0 ? 16 : 12,
                  backgroundColor: Colors.grey.shade300,
                  backgroundImage: comment.fullAuthorAvatar != null
                      ? NetworkImage(comment.fullAuthorAvatar!)
                      : null,
                  child: comment.fullAuthorAvatar == null
                      ? Text(
                          (comment.authorName ?? 'U')
                              .substring(0, 1)
                              .toUpperCase(),
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: depth == 0 ? 12 : 10,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        )
                      : null,
                ),
              ),
              const SizedBox(width: 8),
              // Comment Bubble Area
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Bubble
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 8,
                      ),
                      decoration: BoxDecoration(
                        color: Theme.of(
                          context,
                        ).dividerColor.withAlpha((0.5 * 255).round()),
                        borderRadius: BorderRadius.circular(16),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              GestureDetector(
                                onTap: () {
                                  Navigator.pop(context);
                                  MainLayout.of(context)?.setViewingProfile(comment.authorId);
                                },
                                child: Text(
                                  comment.authorName ?? 'unknown',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                    color: Theme.of(
                                      context,
                                    ).colorScheme.onSurface,
                                  ),
                                ),
                              ),
                              if (comment.authorName ==
                                  widget.post.authorName) ...[
                                const SizedBox(width: 6),
                                Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 6,
                                    vertical: 2,
                                  ),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).colorScheme.primary
                                        .withValues(alpha: 0.1),
                                    borderRadius: BorderRadius.circular(10),
                                    border: Border.all(
                                      color: Theme.of(context)
                                          .colorScheme
                                          .primary
                                          .withValues(alpha: 0.2),
                                    ),
                                  ),
                                  child: Text(
                                    'Tác giả',
                                    style: TextStyle(
                                      color: Theme.of(
                                        context,
                                      ).colorScheme.primary,
                                      fontSize: 8,
                                      fontWeight: FontWeight.w900,
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                ),
                              ],
                            ],
                          ),
                          const SizedBox(height: 2),
                          Text(
                            comment.plainContent,
                            style: TextStyle(
                              fontSize: 14,
                              color: Theme.of(context).colorScheme.onSurface
                                  .withAlpha((0.9 * 255).round()),
                              height: 1.4,
                            ),
                          ),
                          if (comment.fullImageUrl != null) ...[
                            const SizedBox(height: 8),
                            ClipRRect(
                              borderRadius: BorderRadius.circular(8),
                              child: Image.network(
                                comment.fullImageUrl!,
                                height: 150,
                                fit: BoxFit.cover,
                                errorBuilder: (ctx, err, stack) =>
                                    const SizedBox.shrink(),
                              ),
                            ),
                          ],
                        ],
                      ),
                    ),
                    // Actions row (Time, Reply)
                    Padding(
                      padding: const EdgeInsets.only(
                        left: 8,
                        top: 4,
                        bottom: 4,
                      ),
                      child: Row(
                        children: [
                          Text(
                            timeago.format(comment.createdAt, locale: 'vi'),
                            style: TextStyle(
                              fontSize: 11,
                              color: Theme.of(context).colorScheme.onSurface
                                  .withAlpha((0.6 * 255).round()),
                            ),
                          ),
                          const SizedBox(width: 16),
                          InkWell(
                            onTap: () {
                              setState(() => _replyingToComment = comment);
                            },
                            child: Text(
                              'Trả lời',
                              style: TextStyle(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onSurface
                                    .withAlpha((0.7 * 255).round()),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          // Reaction UI
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 2,
                              vertical: 2,
                            ),
                            decoration: BoxDecoration(
                              color: Theme.of(
                                context,
                              ).dividerColor.withAlpha((0.3 * 255).round()),
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: Theme.of(context).dividerColor,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                InkWell(
                                  onTap: () => _handleVoteComment(
                                    comment,
                                    'up',
                                    depth > 0,
                                  ),
                                  borderRadius: BorderRadius.circular(20),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: comment.userVote == 'up'
                                          ? Colors.orange.withAlpha(
                                              (0.15 * 255).round(),
                                            )
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.arrow_upward_rounded,
                                          size: 14,
                                          color: comment.userVote == 'up'
                                              ? Colors.orange
                                              : Theme.of(context)
                                                    .colorScheme
                                                    .onSurface
                                                    .withAlpha(
                                                      (0.6 * 255).round(),
                                                    ),
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${comment.upvotes}',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: comment.userVote == 'up'
                                                ? Colors.orange
                                                : Theme.of(context)
                                                      .colorScheme
                                                      .onSurface
                                                      .withAlpha(
                                                        (0.6 * 255).round(),
                                                      ),
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ),
                                Container(
                                  width: 1,
                                  height: 12,
                                  color: Theme.of(context).dividerColor,
                                  margin: const EdgeInsets.symmetric(
                                    horizontal: 2,
                                  ),
                                ),
                                InkWell(
                                  onTap: () => _handleVoteComment(
                                    comment,
                                    'down',
                                    depth > 0,
                                  ),
                                  borderRadius: BorderRadius.circular(20),
                                  child: Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 6,
                                      vertical: 2,
                                    ),
                                    decoration: BoxDecoration(
                                      color: comment.userVote == 'down'
                                          ? Colors.blue.withAlpha(
                                              (0.15 * 255).round(),
                                            )
                                          : Colors.transparent,
                                      borderRadius: BorderRadius.circular(20),
                                    ),
                                    child: Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(
                                          Icons.arrow_downward_rounded,
                                          size: 14,
                                          color: comment.userVote == 'down'
                                              ? Colors.blue
                                              : Theme.of(context)
                                                    .colorScheme
                                                    .onSurface
                                                    .withAlpha(
                                                      (0.6 * 255).round(),
                                                    ),
                                        ),
                                        const SizedBox(width: 4),
                                        Text(
                                          '${comment.downvotes}',
                                          style: TextStyle(
                                            fontSize: 11,
                                            fontWeight: FontWeight.bold,
                                            color: comment.userVote == 'down'
                                                ? Colors.blue
                                                : Theme.of(context)
                                                      .colorScheme
                                                      .onSurface
                                                      .withAlpha(
                                                        (0.6 * 255).round(),
                                                      ),
                                          ),
                                        ),
                                      ],
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
              ),
            ],
          ),

          if (comment.replies.isNotEmpty)
            Container(
              margin: EdgeInsets.only(left: depth == 0 ? 24 : 12, top: 4),
              decoration: BoxDecoration(
                border: Border(
                  left: BorderSide(
                    color: Theme.of(
                      context,
                    ).dividerColor.withAlpha((0.5 * 255).round()),
                    width: 2,
                  ),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: comment.replies
                    .map((reply) => _buildComment(reply, depth: depth + 1))
                    .toList(),
              ),
            ),
        ],
      ),
    );
  }
}
