import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb, kReleaseMode;

class ApiConstants {
  // Logic to determine base URL based on platform
  static String get baseUrl {
    if (kReleaseMode) {
      return 'https://doan-egyk.onrender.com/api';
    }
    if (kIsWeb) {
      return 'http://localhost:5000/api';
    } else {
      // For Android (using local IP for physical devices/emulators)
      // Note: 10.0.2.2 is for android emulator, 192.168.1.20 is current local IP
      return Platform.isAndroid ? 'http://192.168.1.20:5000/api' : 'http://localhost:5000/api';
    }
  }

  static String get socketUrl {
    return baseUrl.replaceAll('/api', '');
  }
  
  static String get auth => '$baseUrl/auth';
  static String get posts => '$baseUrl/posts';
  static String get comments => '$baseUrl/comments';
  static String get threads => '$baseUrl/threads';
  static String get notifications => '$baseUrl/notifications';
  static String get communities => '$baseUrl/communities';
  static String get savedPosts => '$baseUrl/posts/saved';
  static String get reports => '$baseUrl/reports/create';
  static String get messages => '$baseUrl/messages';
  static String get feedback => '$baseUrl/feedback';
}
