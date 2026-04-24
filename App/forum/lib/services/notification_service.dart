import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import 'api_constants.dart';
import 'auth_service.dart';

class NotificationService {
  static final _notificationStreamController = StreamController<void>.broadcast();
  static Stream<void> get onNewNotification => _notificationStreamController.stream;

  static final _readStreamController = StreamController<void>.broadcast();
  static Stream<void> get onReadNotifications => _readStreamController.stream;

  static final ValueNotifier<int> unreadCount = ValueNotifier(0);

  static Future<void> fetchUnreadCount() async {
    final count = await getUnreadCount();
    unreadCount.value = count;
  }

  static void notifyNewNotification() {
    _notificationStreamController.add(null);
    fetchUnreadCount();
  }

  static void notifyReadNotifications() {
    _readStreamController.add(null);
    fetchUnreadCount();
  }

  static Future<List<dynamic>> getNotifications() async {
    try {
      final String? token = AuthService.token;
      if (token == null) return [];

      final response = await http.get(
        Uri.parse(ApiConstants.notifications),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          return result['data'];
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }

  static Future<int> getUnreadCount() async {
    try {
      final String? token = AuthService.token;
      if (token == null) return 0;

      final response = await http.get(
        Uri.parse('${ApiConstants.notifications}/unread-count'),
        headers: {'Authorization': 'Bearer $token'},
      );

      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          return (result['data'] is int) ? result['data'] : (result['data']['count'] ?? 0);
        }
      }
      return 0;
    } catch (e) {
      return 0;
    }
  }

  static Future<bool> markAsRead(String notificationId) async {
    try {
      final String? token = AuthService.token;
      if (token == null) return false;

      final response = await http.put(
        Uri.parse('${ApiConstants.notifications}/$notificationId/read'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final result = jsonDecode(response.body);
      return response.statusCode == 200 && result['status'] == 'success';
    } catch (e) {
      return false;
    }
  }

  static Future<bool> markAllAsRead() async {
    try {
      final String? token = AuthService.token;
      if (token == null) return false;

      final response = await http.put(
        Uri.parse('${ApiConstants.notifications}/read-all'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      );
      final result = jsonDecode(response.body);
      return response.statusCode == 200 && result['status'] == 'success';
    } catch (e) {
      return false;
    }
  }

  static Future<bool> acceptFriendRequest(String senderId) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return false;

      final response = await http.post(
        Uri.parse('${ApiConstants.baseUrl}/auth/friends/accept'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId, 'senderId': senderId}),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  static Future<bool> rejectFriendRequest(String senderId) async {
    try {
      final String? userId = AuthService.currentUser?.id;
      if (userId == null) return false;

      final response = await http.post(
        Uri.parse('${ApiConstants.baseUrl}/auth/friends/reject'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'userId': userId, 'senderId': senderId}),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }
}
