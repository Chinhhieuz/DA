import '../services/api_constants.dart';

class ChatMessage {
  final String id;
  final String conversationId;
  final String senderId;
  final String content;
  final List<dynamic> rawAttachments;
  final bool isRead;
  final bool isRevoked;
  final DateTime createdAt;

  ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.content,
    this.rawAttachments = const [],
    this.isRead = false,
    this.isRevoked = false,
    required this.createdAt,
  });

  factory ChatMessage.fromJson(Map<String, dynamic> json) {
    return ChatMessage(
      id: json['_id'] ?? json['id'] ?? '',
      conversationId: json['conversation'] ?? '',
      senderId: json['sender'] ?? '',
      content: json['content'] ?? '',
      rawAttachments: json['attachments'] as List? ?? [],
      isRead: json['is_read'] ?? json['isRead'] ?? false,
      isRevoked: json['is_revoked'] ?? json['isRevoked'] ?? false,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at']) 
          : (json['timestamp'] != null ? DateTime.parse(json['timestamp']) : DateTime.now()),
    );
  }

  List<Map<String, dynamic>> get parsedAttachments {
    return rawAttachments.map((item) {
      if (item is Map) {
         String url = item['url']?.toString() ?? '';
         String path = url;
         if (path.startsWith('http://localhost:5000')) {
           path = path.replaceFirst('http://localhost:5000', '');
         }
         if (!path.startsWith('http')) {
           if (path.startsWith('/')) path = path.substring(1);
           path = '${ApiConstants.baseUrl.replaceAll('/api', '')}/$path'; 
         }
         return {
           'url': path,
           'kind': item['kind']?.toString() ?? 'file',
           'name': item['name']?.toString() ?? 'attachment',
           'size': item['size'] ?? 0,
         };
      } else if (item is String) {
         String path = item;
         if (path.startsWith('http://localhost:5000')) {
           path = path.replaceFirst('http://localhost:5000', '');
         }
         if (!path.startsWith('http')) {
           if (path.startsWith('/')) path = path.substring(1);
           path = '${ApiConstants.baseUrl.replaceAll('/api', '')}/$path'; 
         }
         return {
           'url': path,
           'kind': 'unknown',
           'name': 'attachment'
         };
      }
      return <String, dynamic>{};
    }).where((m) => m.isNotEmpty).toList();
  }
}
