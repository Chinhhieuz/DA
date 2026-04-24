import '../services/api_constants.dart';

class Post {
  final String id;
  final String title;
  final String content;
  final String? imageUrl;
  final String? community;
  final String authorId;
  final String? authorName;
  final String? authorAvatar;
  final int upvotes;
  final int downvotes;
  final int commentsCount;
  final DateTime createdAt;
  final bool isSponsored;
  final String? userVote; // 'up', 'down', or null
  final bool isSaved;
  final bool isFollowingAuthor;
  final List<String> imageUrls;
  final String status; // 'approved', 'pending', 'rejected', 'hidden'
  final Map<String, dynamic>? recentComment;
  final String? videoUrl;
  final List<Map<String, dynamic>> attachments;
  final String? timestamp;

  Post({
    required this.id,
    required this.title,
    required this.content,
    this.imageUrl,
    this.community,
    required this.authorId,
    this.authorName,
    this.authorAvatar,
    this.upvotes = 0,
    this.downvotes = 0,
    this.commentsCount = 0,
    required this.createdAt,
    this.isSponsored = false,
    this.userVote,
    this.isSaved = false,
    this.isFollowingAuthor = false,
    this.imageUrls = const [],
    this.status = 'approved',
    this.recentComment,
    this.videoUrl,
    this.attachments = const [],
    this.timestamp,
  });

  factory Post.fromJson(Map<String, dynamic> json) {
    // Handle nested author object or flat fields
    final dynamic author = json['author'];
    String authorId = '';
    String? authorName;
    String? authorAvatar;
    bool isFollowing = false;

    if (author is Map) {
      authorId = author['id']?.toString() ?? author['_id']?.toString() ?? '';
      authorName = author['name'] ?? author['display_name'] ?? author['username'];
      authorAvatar = author['avatar'] ?? author['avatar_url'];
      isFollowing = author['isFollowing'] ?? false;
    } else {
      authorId = author?.toString() ?? '';
    }

    // Handle date parsing safely
    DateTime createdAt;
    try {
      if (json['created_at'] != null) {
        createdAt = DateTime.parse(json['created_at']);
      } else if (json['createdAt'] != null) {
        createdAt = DateTime.parse(json['createdAt']);
      } else {
        // formatPostData doesn't return ISO date, but we might have it in the future
        // For now, if we only have 'timestamp', we'll use now() or try to parse 'timestamp'
        createdAt = DateTime.now();
      }
    } catch (e) {
      createdAt = DateTime.now();
    }

    // Multi-image parsing
    List<String> imageUrls = [];
    if (json['image_urls'] is List) {
      imageUrls = List<String>.from(json['image_urls'].map((e) => e.toString()));
    } else if (json['imageUrls'] is List) {
      imageUrls = List<String>.from(json['imageUrls'].map((e) => e.toString()));
    }

    return Post(
      id: json['id'] ?? json['_id'] ?? '',
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      imageUrl: json['image'] ?? json['image_url'] ?? json['imageUrl'],
      imageUrls: imageUrls,
      status: json['status'] ?? 'approved',
      recentComment: json['recentComment'],
      community: json['community'],
      authorId: authorId,
      authorName: authorName,
      authorAvatar: authorAvatar,
      upvotes: json['upvotes'] ?? 0,
      downvotes: json['downvotes'] ?? 0,
      commentsCount: json['commentCount'] ?? json['commentsCount'] ?? 0,
      createdAt: createdAt,
      isSponsored: json['isSponsored'] ?? false,
      userVote: json['userVote'] ?? json['user_vote'],
      isSaved: json['isSaved'] ?? false,
      isFollowingAuthor: isFollowing || (json['isFollowingAuthor'] ?? false),
      videoUrl: json['video_url'] ?? json['videoUrl'] ?? json['video'],
      attachments: (json['attachments'] as List?)?.map((e) => Map<String, dynamic>.from(e)).toList() ?? [],
      timestamp: json['timestamp'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'title': title,
      'content': content,
      'image_url': imageUrl,
      'image_urls': imageUrls,
      'status': status,
      'community': community,
      'author': authorId,
      'upvotes': upvotes,
      'downvotes': downvotes,
      'isSponsored': isSponsored,
      'attachments': attachments,
    };
  }

  Post copyWith({
    String? id,
    String? title,
    String? content,
    String? imageUrl,
    String? community,
    String? authorId,
    String? authorName,
    String? authorAvatar,
    int? upvotes,
    int? downvotes,
    int? commentsCount,
    DateTime? createdAt,
    bool? isSponsored,
    String? userVote,
    bool? isSaved,
    bool? isFollowingAuthor,
    List<String>? imageUrls,
    String? status,
    Map<String, dynamic>? recentComment,
    String? videoUrl,
    List<Map<String, dynamic>>? attachments,
    String? timestamp,
  }) {
    return Post(
      id: id ?? this.id,
      title: title ?? this.title,
      content: content ?? this.content,
      imageUrl: imageUrl ?? this.imageUrl,
      community: community ?? this.community,
      authorId: authorId ?? this.authorId,
      authorName: authorName ?? this.authorName,
      authorAvatar: authorAvatar ?? this.authorAvatar,
      upvotes: upvotes ?? this.upvotes,
      downvotes: downvotes ?? this.downvotes,
      commentsCount: commentsCount ?? this.commentsCount,
      createdAt: createdAt ?? this.createdAt,
      isSponsored: isSponsored ?? this.isSponsored,
      userVote: userVote ?? this.userVote,
      isSaved: isSaved ?? this.isSaved,
      isFollowingAuthor: isFollowingAuthor ?? this.isFollowingAuthor,
      imageUrls: imageUrls ?? this.imageUrls,
      status: status ?? this.status,
      recentComment: recentComment ?? this.recentComment,
      videoUrl: videoUrl ?? this.videoUrl,
      attachments: attachments ?? this.attachments,
      timestamp: timestamp ?? this.timestamp,
    );
  }

  String? get fullImageUrl {
    if (imageUrl != null && imageUrl!.isNotEmpty) {
      return _getAbsoluteUrl(imageUrl!);
    }
    if (imageUrls.isNotEmpty) {
      return _getAbsoluteUrl(imageUrls.first);
    }
    return null;
  }

  List<String> get fullImageUrls {
    return imageUrls.map((url) => _getAbsoluteUrl(url)).toList();
  }

  String? get fullVideoUrl {
    if (videoUrl == null || videoUrl!.isEmpty) return null;
    return _getAbsoluteUrl(videoUrl!);
  }

  String _getAbsoluteUrl(String path) {
    if (path.startsWith('http')) return path;
    String cleanPath = path;
    if (cleanPath.startsWith('/')) cleanPath = cleanPath.substring(1);
    return '${ApiConstants.baseUrl.replaceAll('/api', '')}/$cleanPath';
  }

  String? get fullAuthorAvatar {
    if (authorAvatar == null || authorAvatar!.isEmpty) return null;
    if (authorAvatar!.startsWith('http')) return authorAvatar;
    String path = authorAvatar!;
    if (path.startsWith('/')) path = path.substring(1);
    return '${ApiConstants.baseUrl.replaceAll('/api', '')}/$path';
  }

  String get plainContent => _stripHtml(content);
  String get plainTitle => _stripHtml(title);

  String? get recentCommentContent {
    if (recentComment == null) return null;
    return _stripHtml(recentComment!['content'] ?? '');
  }

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
