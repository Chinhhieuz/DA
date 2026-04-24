class NotificationModel {
  final String id;
  final String type;
  final bool isRead;
  final String senderName;
  final String? senderAvatar;
  final String? senderId;
  final String? postTitle;
  final String? postId;
  final String? content;
  final DateTime createdAt;

  NotificationModel({
    required this.id,
    required this.type,
    required this.isRead,
    required this.senderName,
    this.senderAvatar,
    this.senderId,
    this.postTitle,
    this.postId,
    this.content,
    required this.createdAt,
  });

  factory NotificationModel.fromJson(Map<String, dynamic> json) {
    return NotificationModel(
      id: json['_id'] ?? '',
      type: json['type'] ?? '',
      isRead: json['isRead'] ?? false,
      senderName: json['sender'] is Map ? (json['sender']['full_name'] ?? json['sender']['display_name'] ?? json['sender']['username']) : 'Người dùng',
      senderAvatar: json['sender'] is Map ? json['sender']['avatar_url'] : null,
      senderId: json['sender'] is Map ? (json['sender']['_id'] ?? json['sender']['id']) : (json['sender'] is String ? json['sender'] : null),
      postTitle: json['post'] is Map ? json['post']['title'] : null,
      postId: json['post'] is Map ? json['post']['_id'] : (json['post'] is String ? json['post'] : null),
      content: json['content'],
      createdAt: json['created_at'] != null ? DateTime.parse(json['created_at']) : DateTime.now(),
    );
  }
}
