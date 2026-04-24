import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_constants.dart';
import 'auth_service.dart';
import 'message_service.dart';
import 'notification_service.dart';
import 'dart:async';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  final _messageController = StreamController<Map<String, dynamic>>.broadcast();
  final _typingController = StreamController<Map<String, dynamic>>.broadcast();
  final _seenController = StreamController<Map<String, dynamic>>.broadcast();
  final _revokedController = StreamController<Map<String, dynamic>>.broadcast();
  final _notificationController = StreamController<Map<String, dynamic>>.broadcast();
  final _conversationDeletedController = StreamController<Map<String, dynamic>>.broadcast();
  final _postAiResultController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get messageStream => _messageController.stream;
  Stream<Map<String, dynamic>> get typingStream => _typingController.stream;
  Stream<Map<String, dynamic>> get seenStream => _seenController.stream;
  Stream<Map<String, dynamic>> get revokedStream => _revokedController.stream;
  Stream<Map<String, dynamic>> get notificationStream => _notificationController.stream;
  Stream<Map<String, dynamic>> get conversationDeletedStream => _conversationDeletedController.stream;
  Stream<Map<String, dynamic>> get postAiResultStream => _postAiResultController.stream;

  bool get isConnected => _socket?.connected ?? false;

  void connect() {
    final token = AuthService.token;
    if (token == null) return;

    if (_socket != null && _socket!.connected) return;

    _socket = io.io(ApiConstants.socketUrl, io.OptionBuilder()
      .setTransports(['websocket'])
      .enableAutoConnect()
      .build());

    _socket!.onConnect((_) {
      debugPrint('🔌 [SOCKET_SERVICE] Connected: ${_socket?.id}');
      _socket!.emit('register', {'token': token});
    });

    _socket!.onConnectError((err) => debugPrint('❌ [SOCKET_SERVICE] Connect Error: $err'));
    _socket!.onDisconnect((_) => debugPrint('❌ [SOCKET_SERVICE] Disconnected'));

    _socket!.on('receive_message', (data) {
      debugPrint('📩 [SOCKET_SERVICE] receive_message: $data');
      _messageController.add(Map<String, dynamic>.from(data));
      MessageService.fetchUnreadCount();
    });

    _socket!.on('typing_start', (data) {
      _typingController.add(Map<String, dynamic>.from(data)..['isTyping'] = true);
    });

    _socket!.on('typing_stop', (data) {
      _typingController.add(Map<String, dynamic>.from(data)..['isTyping'] = false);
    });

    _socket!.on('typing_stop', (data) {
      _typingController.add(Map<String, dynamic>.from(data)..['isTyping'] = false);
    });

    _socket!.on('stop_typing', (data) {
      _typingController.add(Map<String, dynamic>.from(data)..['isTyping'] = false);
    });

    _socket!.on('messages_seen', (data) {
      debugPrint('👁️ [SOCKET_SERVICE] messages_seen: $data');
      _seenController.add(Map<String, dynamic>.from(data));
      MessageService.fetchUnreadCount();
    });

    _socket!.on('message_revoked', (data) {
      _revokedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('new_notification', (data) {
      debugPrint('🔔 [SOCKET_SERVICE] new_notification: $data');
      _notificationController.add(Map<String, dynamic>.from(data));
      NotificationService.notifyNewNotification();
    });

    _socket!.on('conversation_deleted', (data) {
      _conversationDeletedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('post_ai_result', (data) {
      debugPrint('🤖 [SOCKET_SERVICE] post_ai_result: $data');
      _postAiResultController.add(Map<String, dynamic>.from(data));
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
  }

  void emit(String event, dynamic data) {
    _socket?.emit(event, data);
  }

  void dispose() {
    _messageController.close();
    _typingController.close();
    _seenController.close();
    _revokedController.close();
    _notificationController.close();
    _conversationDeletedController.close();
    _postAiResultController.close();
  }
}
