import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:file_picker/file_picker.dart';
import 'api_constants.dart';
import '../models/post.dart';
import 'auth_service.dart';
import 'package:image_picker/image_picker.dart';
import 'package:flutter/foundation.dart';

class PostService {
  static Set<String> savedPostIds = {};
  static bool isSavedPostsFetched = false;
  // Notifier that triggers a home-feed refresh after AI moderation approves a new post.
  static final ValueNotifier<int> refreshFeedNotifier = ValueNotifier(0);

  static Future<void> syncSavedPostsIds() async {
    final userId = AuthService.currentUser?.id;
    if (userId == null) return;
    try {
      final posts = await getSavedPosts(userId);
      savedPostIds = posts.map((p) => p.id).toSet();
      isSavedPostsFetched = true;
    } catch (e) {
      debugPrint('[POST SERVICE] Error syncing saved posts: $e');
    }
  }
  static Future<Map<String, dynamic>> getPosts({
    String? community,
    String? sort,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      String url = ApiConstants.posts;

      Map<String, String> params = {};
      if (community != null) params['community'] = community;
      if (userId != null) params['userId'] = userId;
      if (sort != null) params['sort'] = sort;
      params['page'] = page.toString();
      params['limit'] = limit.toString();

      if (params.isNotEmpty) {
        url += '?';
        params.forEach((key, value) {
          url += '$key=$value&';
        });
        url = url.substring(0, url.length - 1);
      }

      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          final dynamic data = result['data'];

          List<Post> posts = [];
          if (data is List) {
            if (!isSavedPostsFetched) await syncSavedPostsIds();
            posts = data.map((json) {
              final raw = Post.fromJson(json);
              return raw.copyWith(isSaved: savedPostIds.contains(raw.id));
            }).toList();
          } else {
            // Handle specific cases if data is nested differently
          }

          return {
            'posts': posts,
            'hasMore': result['meta']?['hasMore'] ?? false,
          };
        }
      }
      return {'posts': <Post>[], 'hasMore': false};
    } catch (e) {
      return {'posts': <Post>[], 'hasMore': false};
    }
  }

  static Future<Post?> votePost(String postId, String action) async {
    try {
      final String? token = AuthService.token;
      if (token == null) return null;

      final response = await http.put(
        Uri.parse('${ApiConstants.posts}/$postId/react'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'action': action}),
      );

      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        return Post.fromJson(result['data']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<bool?> toggleSavePost(String postId) async {
    try {
      final String? token = AuthService.token;
      if (token == null) return null;

      final response = await http.post(
        Uri.parse('${ApiConstants.posts}/$postId/save'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        final isSaved = result['isSaved'] as bool?;
        if (isSaved == true) {
          savedPostIds.add(postId);
        } else if (isSaved == false) {
          savedPostIds.remove(postId);
        }
        return isSaved;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<Map<String, dynamic>> createPost({
    required String title,
    required String content,
    String? community,
    List<XFile>? imageFiles,
    XFile? videoFile,
    List<PlatformFile>? otherFiles,
  }) async {
    try {
      final String? authorId = AuthService.currentUser?.id;
      if (authorId == null) {
        return {'success': false, 'message': 'Bạn cần đăng nhập để đăng bài'};
      }

      final request = http.MultipartRequest(
        'POST',
        Uri.parse(ApiConstants.posts),
      );

      final token = AuthService.token;
      if (token != null) {
        request.headers['Authorization'] = 'Bearer $token';
      }

      request.fields['author_id'] = authorId;
      request.fields['title'] = title;
      request.fields['content'] = content;
      request.fields['community'] = community ?? 'Chung';

      if (imageFiles != null) {
        for (var i = 0; i < imageFiles.length; i++) {
          final fileName = imageFiles[i].name.toLowerCase();
          final ext = fileName.contains('.') ? fileName.split('.').last : 'jpg';
          final mimeSubtype = (ext == 'png') ? 'png'
              : (ext == 'gif') ? 'gif'
              : (ext == 'webp') ? 'webp'
              : (ext == 'bmp') ? 'bmp'
              : 'jpeg';
          final contentType = MediaType('image', mimeSubtype);

          if (kIsWeb) {
            final bytes = await imageFiles[i].readAsBytes();
            request.files.add(
              http.MultipartFile.fromBytes(
                'image',
                bytes,
                filename: imageFiles[i].name,
                contentType: contentType,
              ),
            );
          } else {
            request.files.add(
              await http.MultipartFile.fromPath(
                'image',
                imageFiles[i].path,
                contentType: contentType,
              ),
            );
          }
        }
      }

    if (otherFiles != null) {
      for (final pf in otherFiles) {
        // Use bytes if available (web always has bytes; mobile may have path)
        if (pf.bytes != null) {
          request.files.add(
            http.MultipartFile.fromBytes(
              'other_file',
              pf.bytes!,
              filename: pf.name,
            ),
          );
        } else if (pf.path != null) {
          request.files.add(
            await http.MultipartFile.fromPath(
              'other_file',
              pf.path!,
              filename: pf.name,
            ),
          );
        }
      }
    }

    if (videoFile != null) {
        final videoFileName = videoFile.name.toLowerCase();
        final videoExt = videoFileName.contains('.') ? videoFileName.split('.').last : 'mp4';
        final videoSubtype = (videoExt == 'mov') ? 'quicktime'
            : (videoExt == 'avi') ? 'x-msvideo'
            : (videoExt == 'mkv') ? 'x-matroska'
            : (videoExt == 'webm') ? 'webm'
            : 'mp4';
        final videoContentType = MediaType('video', videoSubtype);

        if (kIsWeb) {
          final bytes = await videoFile.readAsBytes();
          request.files.add(
            http.MultipartFile.fromBytes(
              'video',
              bytes,
              filename: videoFile.name,
              contentType: videoContentType,
            ),
          );
        } else {
          request.files.add(
            await http.MultipartFile.fromPath(
              'video',
              videoFile.path,
              filename: videoFile.name,
              contentType: videoContentType,
            ),
          );
        }
      }

      /* Fallback for URLs if needed - though frontend/backend prefers files now */

      final streamedResponse = await request.send().timeout(
        const Duration(minutes: 5),
      );
      final response = await http.Response.fromStream(streamedResponse);

      final result = jsonDecode(response.body);

      if ((response.statusCode == 201 || response.statusCode == 200) &&
          result['status'] == 'success') {
        return {'success': true, 'post': Post.fromJson(result['data'])};
      } else {
        return {
          'success': false,
          'message': result['message'] ?? 'Không thể đăng bài',
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<List<Post>> searchPosts(String query) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      String url =
          '${ApiConstants.posts}/search?q=${Uri.encodeComponent(query)}';
      if (userId != null) {
        url += '&userId=$userId';
      }

      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          final List<dynamic> data = result['data'];
          if (!isSavedPostsFetched) await syncSavedPostsIds();
          return data.map((json) {
            final p = Post.fromJson(json);
            return p.copyWith(isSaved: savedPostIds.contains(p.id));
          }).toList();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<List<Post>> getUserPosts(String userId) async {
    try {
      final currentUserId = AuthService.currentUser?.id;
      final url =
          '${ApiConstants.posts}/user/$userId?currentUserId=${currentUserId ?? ""}';
      debugPrint('[POST SERVICE] 🌐 Fetching user posts from: $url');

      final response = await http.get(Uri.parse(url));

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List posts = data['data'];
        if (!isSavedPostsFetched) await syncSavedPostsIds();
        return posts.map((json) {
          final p = Post.fromJson(json);
          return p.copyWith(isSaved: savedPostIds.contains(p.id));
        }).toList();
      }
      return [];
    } catch (e) {
      debugPrint('[POST SERVICE] 🚨 Error fetching user posts: $e');
      return [];
    }
  }

  static Future<List<Post>> getSavedPosts(String userId) async {
    try {
      final String? token = AuthService.token;
      if (token == null) return [];

      final url = '${ApiConstants.posts}/saved/$userId';
      debugPrint('[POST SERVICE] 🌐 Fetching saved posts from: $url');

      final response = await http.get(
        Uri.parse(url),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        final List posts = data['data'];
        final savedList = posts.map((json) {
          final p = Post.fromJson(json);
          return p.copyWith(isSaved: true);
        }).toList();
        
        savedPostIds = savedList.map((p) => p.id).toSet();
        isSavedPostsFetched = true;
        
        return savedList;
      }
      return [];
    } catch (e) {
      debugPrint('[POST SERVICE] 🚨 Error fetching saved posts: $e');
      return [];
    }
  }

  static Future<Map<String, dynamic>> uploadImage(XFile file) async {
    try {
      final bytes = await file.readAsBytes();
      final filename = file.name;
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) {
        return {
          'success': false,
          'message': 'Bạn cần đăng nhập để tải ảnh lên',
        };
      }

      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${ApiConstants.baseUrl}/upload?user_id=$userId'),
      );
      request.files.add(
        http.MultipartFile.fromBytes('image', bytes, filename: filename),
      );

      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 30),
      );
      final response = await http.Response.fromStream(streamedResponse);

      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        return {'success': true, 'url': result['data']['url']};
      }
      return {'success': false, 'message': result['message'] ?? 'Lỗi tải ảnh'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<bool> deletePost(String postId) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return false;

      final response = await http.delete(
        Uri.parse('${ApiConstants.posts}/$postId'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ${AuthService.token}',
        },
        body: jsonEncode({'user_id': userId}),
      );

      final result = jsonDecode(response.body);
      return response.statusCode == 200 && result['status'] == 'success';
    } catch (e) {
      return false;
    }
  }

  static Future<Map<String, dynamic>> reportPost(
    String postId,
    String reason,
    String description,
    List<String> evidenceImages,
  ) async {
    try {
      final String? reporterId = AuthService.currentUser?.id;
      if (reporterId == null) {
        return {'success': false, 'message': 'Bạn cần đăng nhập để báo cáo'};
      }

      final response = await http.post(
        Uri.parse(ApiConstants.reports),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'post_id': postId,
          'reporter_id': reporterId,
          'reason': reason,
          'description': description,
          'evidence_images': evidenceImages,
        }),
      );

      final result = jsonDecode(response.body);
      if (response.statusCode == 201 && result['status'] == 'success') {
        return {'success': true, 'message': result['message']};
      } else {
        return {
          'success': false,
          'message': result['message'] ?? 'Lỗi gửi báo cáo',
        };
      }
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<Post?> getPostById(String postId) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      String url = '${ApiConstants.posts}/$postId';
      if (userId != null) {
        url += '?userId=$userId';
      }

      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          return Post.fromJson(result['data']);
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
}
