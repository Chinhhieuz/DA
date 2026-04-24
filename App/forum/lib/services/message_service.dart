import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart';
import 'api_constants.dart';
import '../models/conversation.dart';
import '../models/message.dart';
import 'auth_service.dart';

class MessageService {
  static final ValueNotifier<int> unreadTotalCount = ValueNotifier(0);

  static Map<String, String> _getHeaders() {
    final token = AuthService.token;
    return {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  static Future<void> fetchUnreadCount() async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return;

      final url = Uri.parse('${ApiConstants.messages}/conversations?userId=$userId');
      final response = await http.get(url, headers: _getHeaders());

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          final convs = (result['data'] as List).map((json) => Conversation.fromJson(json)).toList();
          final total = convs.fold<int>(0, (sum, item) => sum + item.unreadCount);
          unreadTotalCount.value = total;
        }
      }
    } catch (e) {
      debugPrint('Error fetching unread count: $e');
    }
  }

  static Future<List<Conversation>> getConversations() async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return [];

      final url = Uri.parse('${ApiConstants.messages}/conversations?userId=$userId');
      final response = await http.get(url, headers: _getHeaders());

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          final convs = (result['data'] as List).map((json) => Conversation.fromJson(json)).toList();
          unreadTotalCount.value = convs.fold<int>(0, (sum, item) => sum + item.unreadCount);
          return convs;
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error getting conversations: $e');
      return [];
    }
  }

  static Future<Conversation?> startConversation(String targetUserId) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return null;

      final url = Uri.parse('${ApiConstants.messages}/start/$targetUserId?userId=$userId');
      final response = await http.post(url, headers: _getHeaders());

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          return Conversation.fromJson(result['data']);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error starting conversation: $e');
      return null;
    }
  }

  static Future<List<ChatMessage>> getMessages(String conversationId) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return [];

      final url = Uri.parse('${ApiConstants.messages}/$conversationId?userId=$userId');
      final response = await http.get(url, headers: _getHeaders());

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          return (result['data'] as List).map((json) => ChatMessage.fromJson(json)).toList();
        }
      }
      return [];
    } catch (e) {
      debugPrint('Error getting messages: $e');
      return [];
    }
  }

  static Future<ChatMessage?> sendMessage({
    required String recipientId,
    required String content,
    List<dynamic> attachments = const [],
  }) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return null;

      final url = Uri.parse('${ApiConstants.messages}?userId=$userId');
      final response = await http.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'recipientId': recipientId,
          'content': content,
          'attachments': attachments,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          return ChatMessage.fromJson(result['data']);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error sending message: $e');
      return null;
    }
  }

  static Future<bool> markAsRead(String conversationId) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return false;

      final url = Uri.parse('${ApiConstants.messages}/$conversationId/read?userId=$userId');
      final response = await http.put(url, headers: _getHeaders());

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error marking as read: $e');
      return false;
    }
  }

  static Future<bool> revokeMessage(String messageId) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return false;

      final url = Uri.parse('${ApiConstants.messages}/$messageId/revoke?userId=$userId');
      final response = await http.put(url, headers: _getHeaders());

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error revoking message: $e');
      return false;
    }
  }

  static Future<bool> deleteConversation(String conversationId) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return false;

      final url = Uri.parse('${ApiConstants.messages}/conversations/$conversationId?userId=$userId');
      final response = await http.delete(url, headers: _getHeaders());

      return response.statusCode == 200;
    } catch (e) {
      debugPrint('Error deleting conversation: $e');
      return false;
    }
  }

  static Future<ChatMessage?> shareMessage({
    required String messageId,
    required String recipientId,
  }) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return null;

      final url = Uri.parse('${ApiConstants.messages}/share?userId=$userId');
      final response = await http.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode({
          'messageId': messageId,
          'recipientId': recipientId,
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          return ChatMessage.fromJson(result['data']);
        }
      }
      return null;
    } catch (e) {
      debugPrint('Error sharing message: $e');
      return null;
    }
  }

  static Future<Map<String, dynamic>> uploadAttachment(File file) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) {
        return {'success': false, 'message': 'Bạn cần đăng nhập để tải tệp lên'};
      }

      final request = http.MultipartRequest(
        'POST', 
        Uri.parse('${ApiConstants.messages}/upload')
      );
      
      // Inherit Authorization header from existing service
      request.headers.addAll(_getHeaders()..remove('Content-Type'));
      
      request.files.add(await http.MultipartFile.fromPath('file', file.path));
      
      final streamedResponse = await request.send().timeout(const Duration(minutes: 5)); // Increase timeout for videos
      final response = await http.Response.fromStream(streamedResponse);
      
      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        final data = result['data'];
        final attachmentObj = (data is Map && data.containsKey('attachment')) 
            ? data['attachment'] 
            : data;
        
        final url = (data is Map && data.containsKey('attachment')) 
            ? data['attachment']['url'] 
            : (data is Map && data.containsKey('url') ? data['url'] : data);
            
        return {'success': true, 'url': url, 'attachment': attachmentObj};
      }
      return {'success': false, 'message': result['message'] ?? 'Lỗi tải tệp'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }
}
