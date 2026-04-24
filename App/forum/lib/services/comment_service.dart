import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_constants.dart';
import '../models/comment.dart';
import 'auth_service.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart' show kIsWeb;

class CommentService {
  static Future<List<Comment>> getCommentsByPost(String postId) async {
    try {
      final String? token = AuthService.token;
      final response = await http.get(
        Uri.parse('${ApiConstants.comments}/post/$postId'),
        headers: token != null ? {
          'Authorization': 'Bearer $token',
        } : null,
      );
      
      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          final List<dynamic> data = result['data'];
          return data.map((json) => Comment.fromJson(json)).toList();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<List<Comment>> getCommentsByUser(String userId) async {
    try {
      final response = await http.get(Uri.parse('${ApiConstants.comments}/user/$userId'));
      
      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          final List<dynamic> data = result['data'];
          return data.map((json) => Comment.fromJson(json)).toList();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<Map<String, dynamic>> createComment({
    required String postId,
    required String content,
    XFile? imageFile,
  }) async {
    try {
      final String? token = AuthService.token;
      if (token == null) {
        return {'success': false, 'message': 'Bạn cần đăng nhập để bình luận'};
      }

      // If no image, send simple JSON. The backend /comments/create route has
      // no multer middleware, so multipart bodies are NOT parsed.
      if (imageFile == null) {
        final response = await http.post(
          Uri.parse('${ApiConstants.comments}/create'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode({
            'post_id': postId,
            'content': content,
          }),
        );

        final result = jsonDecode(response.body);
        if ((response.statusCode == 201 || response.statusCode == 200) &&
            result['status'] == 'success') {
          return {'success': true, 'comment': Comment.fromJson(result['data'])};
        } else {
          return {'success': false, 'message': result['message'] ?? 'Không thể gửi bình luận'};
        }
      }

      // With image: use multipart (multer must be present on backend)
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${ApiConstants.comments}/create'),
      );

      request.headers['Authorization'] = 'Bearer $token';
      request.fields['post_id'] = postId;
      request.fields['content'] = content;
      
      if (kIsWeb) {
        request.files.add(http.MultipartFile.fromBytes(
          'image',
          await imageFile.readAsBytes(),
          filename: imageFile.name,
        ));
      } else {
        request.files.add(await http.MultipartFile.fromPath('image', imageFile.path));
      }

      final streamedResponse = await request.send().timeout(const Duration(seconds: 60));
      final response = await http.Response.fromStream(streamedResponse);
      final result = jsonDecode(response.body);

      if ((response.statusCode == 201 || response.statusCode == 200) &&
          result['status'] == 'success') {
        return {'success': true, 'comment': Comment.fromJson(result['data'])};
      } else {
        return {'success': false, 'message': result['message'] ?? 'Không thể gửi bình luận'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<Map<String, dynamic>> createReply({
    required String commentId,
    required String content,
  }) async {
    try {
      final String? authorId = AuthService.currentUser?.id;
      final String? token = AuthService.token;
      if (authorId == null || token == null) {
        return {'success': false, 'message': 'Bạn cần đăng nhập để trả lời'};
      }

      final response = await http.post(
        Uri.parse('${ApiConstants.threads}/create'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'comment_id': commentId,
          'author_id': authorId,
          'content': content,
        }),
      );

      final result = jsonDecode(response.body);

      if (response.statusCode == 201 && result['status'] == 'success') {
        return {'success': true, 'reply': Comment.fromJson(result['data'])};
      } else {
        return {'success': false, 'message': result['message'] ?? 'Không thể gửi phản hồi'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<bool> voteComment({
    required String targetId,
    required String action,
    required String targetType, // 'comments' or 'threads'
  }) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      final String? token = AuthService.token;
      if (userId == null || token == null) return false;

      final response = await http.put(
        Uri.parse('${ApiConstants.baseUrl}/$targetType/$targetId/react'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'user_id': userId,
          'action': action, // 'up', 'down', 'unlike', 'undislike'
          'type': action == 'up' || action == 'unlike' ? 'up' : 'down',
        }),
      );

      final result = jsonDecode(response.body);
      return response.statusCode == 200 && result['status'] == 'success';
    } catch (e) {
      return false;
    }
  }
}
