import '../services/api_constants.dart';

class MessageParticipant {
  final String id;
  final String username;
  final String fullName;
  final String? avatarUrl;

  MessageParticipant({
    required this.id,
    required this.username,
    required this.fullName,
    this.avatarUrl,
  });

  factory MessageParticipant.fromJson(Map<String, dynamic> json) {
    return MessageParticipant(
      id: json['_id'] ?? json['id'] ?? '',
      username: json['username'] ?? '',
      fullName: json['full_name'] ?? json['display_name'] ?? json['username'] ?? 'Người dùng',
      avatarUrl: json['avatar_url'] ?? json['avatar'],
    );
  }

  String? get fullAvatarUrl {
    if (avatarUrl == null || avatarUrl!.isEmpty) return null;
    if (avatarUrl!.startsWith('http')) return avatarUrl;
    String path = avatarUrl!;
    if (path.startsWith('/')) path = path.substring(1);
    return '${ApiConstants.baseUrl.replaceAll('/api', '')}/$path';
  }
}

class Conversation {
  final String id;
  final List<MessageParticipant> participants;
  final Map<String, dynamic>? lastMessage;
  final int unreadCount;

  Conversation({
    required this.id,
    required this.participants,
    this.lastMessage,
    this.unreadCount = 0,
  });

  factory Conversation.fromJson(Map<String, dynamic> json) {
    return Conversation(
      id: json['_id'] ?? json['id'] ?? '',
      participants: (json['participants'] as List?)
              ?.map((p) => MessageParticipant.fromJson(p))
              .toList() ??
          [],
      lastMessage: json['last_message'] ?? json['lastMessage'],
      unreadCount: json['unread_count'] ?? json['unreadCount'] ?? 0,
    );
  }
}
