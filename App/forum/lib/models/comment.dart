import '../services/api_constants.dart';

class Comment {
  final String id;
  final String content;
  final String authorId;
  final String? authorName;
  final String? authorAvatar;
  final String postId;
  final String? postTitle;
  final int upvotes;
  final int downvotes;
  final String? userVote;
  final String? imageUrl;
  final DateTime createdAt;
  final List<Comment> replies;

  String? get fullAuthorAvatar {
    if (authorAvatar == null || authorAvatar!.isEmpty) return null;
    if (authorAvatar!.startsWith('http')) return authorAvatar;
    String path = authorAvatar!;
    if (path.startsWith('/')) path = path.substring(1);
    return '${ApiConstants.baseUrl.replaceAll('/api', '')}/$path';
  }

  String? get fullImageUrl {
    if (imageUrl == null || imageUrl!.isEmpty) return null;
    if (imageUrl!.startsWith('http')) return imageUrl;
    String path = imageUrl!;
    if (path.startsWith('/')) path = path.substring(1);
    return '${ApiConstants.baseUrl.replaceAll('/api', '')}/$path';
  }

  Comment({
    required this.id,
    required this.content,
    required this.authorId,
    this.authorName,
    this.authorAvatar,
    required this.postId,
    this.postTitle,
    this.upvotes = 0,
    this.downvotes = 0,
    this.userVote,
    this.imageUrl,
    required this.createdAt,
    this.replies = const [],
  });

  factory Comment.fromJson(Map<String, dynamic> json) {
    return Comment(
      id: json['_id'] ?? '',
      content: json['content'] ?? '',
      authorId: json['author'] is Map ? json['author']['_id'] : (json['author'] ?? ''),
      authorName: json['author'] is Map ? json['author']['username'] : null,
      authorAvatar: json['author'] is Map ? (json['author']['avatar_url'] ?? json['author']['profilePicture']) : null,
      postId: json['post'] is Map ? (json['post']['_id'] ?? '') : (json['post'] ?? ''),
      postTitle: json['post'] is Map ? json['post']['title'] : null,
      upvotes: json['upvotes'] ?? 0,
      downvotes: json['downvotes'] ?? 0,
      userVote: json['userVote'] ?? json['user_vote'],
      imageUrl: json['image_url'] ?? json['imageUrl'],
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']) 
          : (json['createdAt'] != null ? DateTime.parse(json['createdAt']) : DateTime.now()),
      replies: (json['threads'] != null)
          ? (json['threads'] as List).map((r) => Comment.fromJson(r)).toList()
          : (json['replies'] != null
              ? (json['replies'] as List).map((r) => Comment.fromJson(r)).toList()
              : []),
    );
  }

  String get plainContent => _stripHtml(content);

  String _stripHtml(String html) {
    return html
        .replaceAll(RegExp(r'<[^>]*>'), '') // Strip tags
        .replaceAll('&nbsp;', ' ')        // Decode common entities
        .replaceAll('&amp;', '&')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .trim();
  }
}
