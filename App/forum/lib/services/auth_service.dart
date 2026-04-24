import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'api_constants.dart';
import '../models/user.dart';

export '../models/user.dart';

class AuthService {
  static String? _token;
  static User? _currentUser;

  static const _keyToken = 'auth_token';
  static const _keyUser = 'auth_user';

  static String? get token => _token;
  static User? get currentUser => _currentUser;

  /// Called at app startup to restore a saved session.
  static Future<bool> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final storedToken = prefs.getString(_keyToken);
      final storedUserJson = prefs.getString(_keyUser);
      if (storedToken != null && storedUserJson != null) {
        _token = storedToken;
        _currentUser = User.fromJson(jsonDecode(storedUserJson));
        return true; // session restored
      }
    } catch (_) {}
    return false;
  }

  static Future<Map<String, dynamic>> login(String email, String password, {bool rememberMe = false}) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConstants.auth}/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      );

      final result = jsonDecode(response.body);

      if (response.statusCode == 200 && result['status'] == 'success') {
        _token = result['data']['token'];
        _currentUser = User.fromJson(result['data']['user']);

        if (rememberMe) {
          final prefs = await SharedPreferences.getInstance();
          await prefs.setString(_keyToken, _token!);
          await prefs.setString(_keyUser, jsonEncode(result['data']['user']));
        }

        return {'success': true, 'message': result['message']};
      } else {
        return {'success': false, 'message': result['message'] ?? 'Đăng nhập thất bại'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<Map<String, dynamic>> register(String username, String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConstants.auth}/register'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'username': username,
          'email': email,
          'password': password,
        }),
      );

      final result = jsonDecode(response.body);

      if (response.statusCode == 201 && result['status'] == 'success') {
        return {'success': true, 'message': result['message']};
      } else {
        return {'success': false, 'message': result['message'] ?? 'Đăng ký thất bại'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<Map<String, dynamic>> updateProfile({
    String? displayName,
    String? bio,
    String? location,
    String? website,
    String? avatarUrl,
    String? mssv,
    String? faculty,
  }) async {
    try {
      if (_token == null) throw Exception('Chưa đăng nhập');

      final Map<String, dynamic> updateData = {
        'accountId': _currentUser?.id,
      };
      
      if (displayName != null) updateData['full_name'] = displayName;
      if (bio != null) updateData['bio'] = bio;
      if (location != null) updateData['location'] = location;
      if (website != null) updateData['website'] = website;
      if (avatarUrl != null) updateData['avatar_url'] = avatarUrl;
      if (mssv != null) updateData['mssv'] = mssv;
      if (faculty != null) updateData['faculty'] = faculty;

      final response = await http.put(
        Uri.parse('${ApiConstants.auth}/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: jsonEncode(updateData),
      );

      final result = jsonDecode(response.body);

      if (response.statusCode == 200 && result['status'] == 'success') {
        // Update local user data if necessary
        // Note: The backend might return the updated user object
        if (result['data'] != null) {
          _currentUser = User.fromJson(result['data']);
        }
        return {'success': true, 'message': result['message']};
      } else {
        return {'success': false, 'message': result['message'] ?? 'Cập nhật thất bại'};
      }
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static void logout() async {
    _token = null;
    _currentUser = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_keyToken);
    await prefs.remove(_keyUser);
  }

  static Future<Map<String, dynamic>> forgotPassword(String email) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConstants.auth}/forgot-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email}),
      );
      final result = jsonDecode(response.body);
      return {'success': response.statusCode == 200, 'message': result['message']};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<Map<String, dynamic>> resetPassword(String token, String newPassword) async {
    try {
      final response = await http.post(
        Uri.parse('${ApiConstants.auth}/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'token': token, 'newPassword': newPassword}),
      );
      final result = jsonDecode(response.body);
      return {'success': response.statusCode == 200, 'message': result['message']};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<Map<String, dynamic>> getUserStats(String userId) async {
    try {
      final response = await http.get(
        Uri.parse('${ApiConstants.auth}/stats/$userId'),
      );
      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        return {'success': true, 'data': result['data']};
      }
      return {'success': false, 'message': result['message'] ?? 'Lỗi tải thống kê'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<Map<String, dynamic>> changePassword(String oldPassword, String newPassword) async {
    try {
      if (_token == null) throw Exception('Chưa đăng nhập');
      final response = await http.put(
        Uri.parse('${ApiConstants.auth}/change-password'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: jsonEncode({
          'accountId': _currentUser?.id,
          'oldPassword': oldPassword,
          'newPassword': newPassword,
        }),
      );
      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        return {'success': true, 'message': result['message']};
      }
      return {'success': false, 'message': result['message'] ?? 'Đổi mật khẩu thất bại'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }
  
  static Future<Map<String, dynamic>> updateSettings(Map<String, dynamic> preferences) async {
    try {
      if (_token == null) throw Exception('Chưa đăng nhập');
      final response = await http.put(
        Uri.parse('${ApiConstants.auth}/settings'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: jsonEncode({
          'accountId': _currentUser?.id,
          'preferences': preferences,
        }),
      );
      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        if (result['data'] != null) {
          _currentUser = User.fromJson(result['data']);
        }
        return {'success': true, 'message': result['message']};
      }
      return {'success': false, 'message': result['message'] ?? 'Cập nhật cài đặt thất bại'};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<Map<String, dynamic>> followUser(String targetId) async {
    try {
      if (_token == null) throw Exception('Chưa đăng nhập');
      final response = await http.post(
        Uri.parse('${ApiConstants.auth}/friends/follow'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: jsonEncode({
          'targetId': targetId,
        }),
      );
      final result = jsonDecode(response.body);
      return {'success': response.statusCode == 200, 'message': result['message']};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<Map<String, dynamic>> unfollowUser(String targetId) async {
    try {
      if (_token == null) throw Exception('Chưa đăng nhập');
      final response = await http.post(
        Uri.parse('${ApiConstants.auth}/friends/unfollow'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $_token',
        },
        body: jsonEncode({
          'targetId': targetId,
        }),
      );
      final result = jsonDecode(response.body);
      return {'success': response.statusCode == 200, 'message': result['message']};
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  static Future<User?> getProfile(String userId) async {
    try {
      final String? currentUserId = _currentUser?.id;
      String url = '${ApiConstants.auth}/profile/$userId';
      if (currentUserId != null) {
        url += '?currentUserId=$currentUserId';
      }
      final response = await http.get(Uri.parse(url));
      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        return User.fromJson(result['data']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<Map<String, dynamic>?> getAggregatedProfile(String userId) async {
    try {
      final String? currentUserId = _currentUser?.id;
      String url = '${ApiConstants.auth}/profile/aggregated/$userId';
      if (currentUserId != null) {
        url += '?currentUserId=$currentUserId';
      }
      final response = await http.get(Uri.parse(url));
      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        return result['data'];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  static Future<List<User>> getFollowers(String userId) async {
    try {
      final response = await http.get(Uri.parse('${ApiConstants.auth}/friends/followers/$userId'));
      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        final List<dynamic> data = result['data'];
        return data.map((u) => User.fromJson(u)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<List<User>> getFollowing(String userId) async {
    try {
      final response = await http.get(Uri.parse('${ApiConstants.auth}/friends/following/$userId'));
      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        final List<dynamic> data = result['data'];
        return data.map((u) => User.fromJson(u)).toList();
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<List<User>> searchUsers(String query) async {
    try {
      final response = await http.get(Uri.parse('${ApiConstants.auth}/search/users?q=${Uri.encodeComponent(query)}'));
      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          final List<dynamic> data = result['data'];
          return data.map((u) => User.fromJson(u)).toList();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}
