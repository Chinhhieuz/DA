import 'dart:async';
import 'package:flutter/material.dart';
import '../../models/conversation.dart';
import '../../services/message_service.dart';
import '../../services/auth_service.dart';
import '../../services/socket_service.dart';
import 'chat_detail_screen.dart';
import '../../utils/responsive.dart';

class ChatListScreen extends StatefulWidget {
  const ChatListScreen({super.key});

  @override
  State<ChatListScreen> createState() => _ChatListScreenState();
}

class _ChatListScreenState extends State<ChatListScreen> {
  List<Conversation> _conversations = [];
  bool _isLoading = true;
  String _searchQuery = '';
  final List<StreamSubscription> _subscriptions = [];

  @override
  void initState() {
    super.initState();
    _fetchConversations();
    _initSocketListeners();
  }

  void _initSocketListeners() {
    final socketService = SocketService();
    socketService.connect();

    _subscriptions.add(socketService.messageStream.listen((data) {
      debugPrint('[CHATLIST] Received message via SocketService: $data');
      if (!mounted) return;
      
      setState(() {
        final convId = data['conversation'];
        final index = _conversations.indexWhere((c) => c.id == convId);
        
        if (index != -1) {
          final updated = List<Conversation>.from(_conversations);
          final oldConv = updated[index];
          
          updated[index] = Conversation(
            id: oldConv.id,
            participants: oldConv.participants,
            lastMessage: data,
            unreadCount: (data['sender'] != AuthService.currentUser?.id) 
              ? oldConv.unreadCount + 1 
              : oldConv.unreadCount,
          );
          
          final item = updated.removeAt(index);
          updated.insert(0, item);
          _conversations = updated;
        } else {
          _fetchConversations(silent: true);
        }
      });
    }));

    _subscriptions.add(socketService.seenStream.listen((data) {
      if (!mounted) return;
      debugPrint('[CHATLIST] Received seen via SocketService: $data');
      setState(() {
        final convId = data['conversationId'];
        if (data['seenBy'] == AuthService.currentUser?.id) {
          final index = _conversations.indexWhere((c) => c.id == convId);
          if (index != -1) {
            final updated = List<Conversation>.from(_conversations);
            updated[index] = Conversation(
              id: updated[index].id,
              participants: updated[index].participants,
              lastMessage: updated[index].lastMessage,
              unreadCount: 0,
            );
            _conversations = updated;
          }
        }
      });
    }));

    _subscriptions.add(socketService.conversationDeletedStream.listen((data) {
       if (!mounted) return;
       debugPrint('[CHATLIST] Received deleted via SocketService: $data');
       setState(() {
         _conversations.removeWhere((c) => c.id == data['conversationId']);
       });
    }));
  }

  @override
  void dispose() {
    for (var sub in _subscriptions) {
      sub.cancel();
    }
    super.dispose();
  }

  Future<void> _fetchConversations({bool silent = false}) async {
    if (!silent) {
      setState(() => _isLoading = true);
    }
    
    final convs = await MessageService.getConversations();
    
    if (mounted) {
      setState(() {
        _conversations = convs;
        _isLoading = false;
      });
    }
  }

  void _handleDeleteConversation(String convId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa cuộc trò chuyện'),
        content: const Text('Bạn có chắc chắn muốn xóa cuộc trò chuyện này? Toàn bộ tin nhắn sẽ bị xóa cho cả hai bên.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
          TextButton(
            onPressed: () => Navigator.pop(context, true), 
            child: const Text('Xóa', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))
          ),
        ],
      ),
    );

    if (confirm == true) {
      final success = await MessageService.deleteConversation(convId);
      if (success && mounted) {
        if (!mounted) return;
        setState(() {
          _conversations.removeWhere((c) => c.id == convId);
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đã xóa cuộc trò chuyện'))
        );
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Lỗi khi xóa cuộc trò chuyện'))
          );
        }
      }
    }
  }



  MessageParticipant? _getOtherParticipant(Conversation conv) {
    if (conv.participants.isEmpty) return null;
    final currentUserId = AuthService.currentUser?.id;
    try {
      return conv.participants.firstWhere((p) => p.id != currentUserId);
    } catch (e) {
      return conv.participants.first;
    }
  }

  String _formatTime(String? timestamp) {
    if (timestamp == null) return '';
    try {
      final date = DateTime.parse(timestamp).toLocal();
      final now = DateTime.now();
      if (date.year == now.year && date.month == now.month && date.day == now.day) {
        return '${date.hour.toString().padLeft(2, '0')}:${date.minute.toString().padLeft(2, '0')}';
      }
      return '${date.day}/${date.month}';
    } catch (e) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    final filteredConvs = _conversations.where((conv) {
      if (_searchQuery.isEmpty) return true;
      final otherUser = _getOtherParticipant(conv);
      final nameMatch = otherUser?.fullName.toLowerCase().contains(_searchQuery.toLowerCase()) ?? false;
      final msgMatch = conv.lastMessage?['content']?.toString().toLowerCase().contains(_searchQuery.toLowerCase()) ?? false;
      return nameMatch || msgMatch;
    }).toList();

    int totalUnread = _conversations.fold(0, (sum, conv) => sum + conv.unreadCount);

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Tin nhắn', style: TextStyle(fontWeight: FontWeight.w800, fontSize: 20.sp(context))),
        backgroundColor: Theme.of(context).cardColor,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
        actions: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            margin: const EdgeInsets.only(right: 16),
            decoration: BoxDecoration(
              color: Colors.transparent,
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Container(
                  width: 8, height: 8,
                  decoration: const BoxDecoration(color: Colors.blue, shape: BoxShape.circle),
                ),
                const SizedBox(width: 6),
                Text('ĐÃ KẾT NỐI', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface.withAlpha(150), letterSpacing: 0.5)),
              ],
            ),
          )
        ],
      ),
      body: Column(
        children: [
          // Header Stats & Search
          Container(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
            decoration: BoxDecoration(
              color: Theme.of(context).cardColor,
              border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor.withValues(alpha: 0.5))),
            ),
            child: Column(
              children: [
                // Search Input
                Container(
                  decoration: BoxDecoration(
                    color: Theme.of(context).scaffoldBackgroundColor,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
                  ),
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: 'Tìm kiếm người hoặc hội thoại',
                      hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha(120), fontSize: 13.sp(context)),
                      prefixIcon: Icon(Icons.search, color: Colors.grey, size: 18.sp(context)),
                      border: InputBorder.none,
                      contentPadding: EdgeInsets.symmetric(horizontal: 16.sp(context), vertical: 12.sp(context)),
                      suffixIcon: _searchQuery.isNotEmpty 
                        ? IconButton(icon: Icon(Icons.close, size: 16.sp(context)), onPressed: () => setState(() => _searchQuery = ''))
                        : null,
                    ),
                    onChanged: (val) => setState(() => _searchQuery = val),
                  ),
                ),
                const SizedBox(height: 12),
                // Stats
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                        decoration: BoxDecoration(
                          color: Theme.of(context).scaffoldBackgroundColor,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('HỘI THOẠI', style: TextStyle(fontSize: 9.sp(context), fontWeight: FontWeight.bold, letterSpacing: 1, color: Theme.of(context).colorScheme.onSurface.withAlpha(150))),
                            const SizedBox(height: 4),
                            Text('${_conversations.length}', style: TextStyle(fontSize: 16.sp(context), fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
                        decoration: BoxDecoration(
                          color: Theme.of(context).scaffoldBackgroundColor,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('CHƯA ĐỌC', style: TextStyle(fontSize: 9.sp(context), fontWeight: FontWeight.bold, letterSpacing: 1, color: Theme.of(context).colorScheme.onSurface.withAlpha(150))),
                            const SizedBox(height: 4),
                            Text('$totalUnread', style: TextStyle(fontSize: 16.sp(context), fontWeight: FontWeight.bold)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
          
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFFD32F2F)))
                : _conversations.isEmpty
                    ? Center(child: Text('Chưa có cuộc trò chuyện nào', style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha(150))))
                    : filteredConvs.isEmpty && _searchQuery.isNotEmpty
                        ? const Center(child: Text('Không tìm thấy tin nhắn'))
                        : RefreshIndicator(
                            onRefresh: () => _fetchConversations(),
                            color: const Color(0xFFD32F2F),
                            child: ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: filteredConvs.length,
                              itemBuilder: (context, index) {
                                final conv = filteredConvs[index];
                                final otherUser = _getOtherParticipant(conv);
                                
                                if (otherUser == null) return const SizedBox.shrink();

                                final lastMsg = conv.lastMessage;
                                String lastMsgContent = lastMsg?['content'] ?? '';
                                
                                if (lastMsgContent.isEmpty) {
                                  final attachments = lastMsg?['attachments'] as List?;
                                  if (attachments != null && attachments.isNotEmpty) {
                                    final first = attachments[0];
                                    if (first is Map && (first['kind'] == 'image' || first['kind'] == 'video')) {
                                      lastMsgContent = '[Hình ảnh]';
                                    } else {
                                      lastMsgContent = '[Tệp đính kèm]';
                                    }
                                  } else {
                                    lastMsgContent = 'Chưa có tin nhắn';
                                  }
                                }

                                final isUnread = conv.unreadCount > 0;
                                final isRevoked = conv.lastMessage?['is_revoked'] == true;

                                return Padding(
                                  padding: const EdgeInsets.only(bottom: 8),
                                  child: InkWell(
                                    onTap: () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (_) => ChatDetailScreen(
                                            conversation: conv,
                                            otherUser: otherUser,
                                          ),
                                        ),
                                      ).then((_) => _fetchConversations(silent: true));
                                    },
                                    onLongPress: () => _handleDeleteConversation(conv.id),
                                    borderRadius: BorderRadius.circular(16),
                                    child: Container(
                                      padding: const EdgeInsets.all(12),
                                      decoration: BoxDecoration(
                                        color: isUnread ? const Color(0xFFD32F2F).withValues(alpha: 0.06) : Colors.transparent,
                                        borderRadius: BorderRadius.circular(16),
                                        border: Border.all(
                                          color: isUnread ? const Color(0xFFD32F2F).withValues(alpha: 0.1) : Colors.transparent,
                                        ),
                                      ),
                                      child: Row(
                                        children: [
                                          Stack(
                                            children: [
                                              Container(
                                                decoration: BoxDecoration(
                                                  shape: BoxShape.circle,
                                                  border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
                                                ),
                                                child: CircleAvatar(
                                                  radius: 24.sp(context),
                                                  backgroundColor: Theme.of(context).scaffoldBackgroundColor,
                                                  backgroundImage: otherUser.fullAvatarUrl != null 
                                                    ? NetworkImage(otherUser.fullAvatarUrl!) 
                                                    : null,
                                                  child: otherUser.fullAvatarUrl == null 
                                                    ? Text(otherUser.fullName[0].toUpperCase(), style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 16.sp(context))) 
                                                    : null,
                                                ),
                                              ),
                                              if (isUnread)
                                                Positioned(
                                                  top: 0,
                                                  right: 0,
                                                  child: Container(
                                                    width: 14,
                                                    height: 14,
                                                    decoration: BoxDecoration(
                                                      color: Colors.red,
                                                      shape: BoxShape.circle,
                                                      border: Border.all(color: Theme.of(context).cardColor, width: 2),
                                                    ),
                                                  ),
                                                ),
                                            ],
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Column(
                                              crossAxisAlignment: CrossAxisAlignment.start,
                                              children: [
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Expanded(
                                                      child: Text(
                                                        otherUser.fullName,
                                                        maxLines: 1,
                                                        overflow: TextOverflow.ellipsis,
                                                        style: TextStyle(
                                                          fontWeight: isUnread ? FontWeight.w900 : FontWeight.w600,
                                                          color: isUnread ? const Color(0xFFD32F2F) : Theme.of(context).colorScheme.onSurface,
                                                          fontSize: 14.sp(context),
                                                        ),
                                                      ),
                                                    ),
                                                    Text(
                                                      _formatTime(conv.lastMessage?['created_at']),
                                                      style: TextStyle(
                                                        fontSize: 10,
                                                        color: isUnread ? const Color(0xFFD32F2F) : Colors.grey,
                                                        fontWeight: isUnread ? FontWeight.bold : FontWeight.w500,
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                                const SizedBox(height: 4),
                                                Row(
                                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                  children: [
                                                    Expanded(
                                                      child: Text(
                                                        isRevoked ? 'Tin nhắn đã được thu hồi' : lastMsgContent,
                                                        maxLines: 1,
                                                        overflow: TextOverflow.ellipsis,
                                                        style: TextStyle(
                                                          fontWeight: isUnread ? FontWeight.w700 : FontWeight.normal,
                                                          color: isUnread ? Theme.of(context).colorScheme.onSurface : Colors.grey,
                                                          fontSize: 12.sp(context),
                                                        ),
                                                      ),
                                                    ),
                                                    if (isUnread)
                                                      Container(
                                                        margin: const EdgeInsets.only(left: 8),
                                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                        decoration: BoxDecoration(
                                                          color: Colors.red,
                                                          borderRadius: BorderRadius.circular(10),
                                                        ),
                                                        child: Text(
                                                          conv.unreadCount > 99 ? '99+' : '${conv.unreadCount}',
                                                          style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
                                                        ),
                                                      ),
                                                  ],
                                                ),
                                              ],
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}
