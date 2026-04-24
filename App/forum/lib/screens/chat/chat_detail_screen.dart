import 'dart:async';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import 'package:video_player/video_player.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../models/conversation.dart';
import '../../models/message.dart';
import '../../services/message_service.dart';
import '../../services/auth_service.dart';
import '../../services/socket_service.dart';
import 'dart:io';
import '../../widgets/video_player_widget.dart';
import 'media_utils.dart';
import 'forward_message_modal.dart';
import '../home/main_layout.dart';
class ChatDetailScreen extends StatefulWidget {
  final Conversation conversation;
  final MessageParticipant otherUser;

  const ChatDetailScreen({
    super.key,
    required this.conversation,
    required this.otherUser,
  });

  @override
  State<ChatDetailScreen> createState() => _ChatDetailScreenState();
}

class _ChatDetailScreenState extends State<ChatDetailScreen> {
  final TextEditingController _msgController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  
  List<ChatMessage> _messages = [];
  bool _isLoading = true;
  File? _selectedFile;
  String? _selectedFileType;
  bool _isAttachmentMenuOpen = false;
  bool _isUploading = false;
  bool _isOtherUserTyping = false;
  Timer? _typingTimer;
  final List<StreamSubscription> _subscriptions = [];

  @override
  void initState() {
    super.initState();
    _fetchMessages();
    MessageService.markAsRead(widget.conversation.id);
    _initSocketListeners();
  }

  void _initSocketListeners() {
    final socketService = SocketService();
    socketService.connect();

    _subscriptions.add(socketService.messageStream.listen((data) {
      debugPrint('[CHATDETAIL] Received message via SocketService: $data');
      if (data['conversation'] == widget.conversation.id) {
        if (mounted) {
          final msgId = data['_id'] ?? data['id'] ?? '';
          final alreadyExists = _messages.any((m) => m.id == msgId);
          
          if (!alreadyExists) {
            setState(() {
              _messages.add(ChatMessage.fromJson(data));
            });
            _scrollToBottom();
            MessageService.markAsRead(widget.conversation.id);
          }
        }
      }
    }));

    _subscriptions.add(socketService.typingStream.listen((data) {
      if (data['conversationId'] == widget.conversation.id &&
          data['senderId'] != AuthService.currentUser?.id &&
          mounted) {
        setState(() => _isOtherUserTyping = data['isTyping'] ?? false);
      }
    }));

    _subscriptions.add(socketService.seenStream.listen((data) {
      if (data['conversationId'] == widget.conversation.id && mounted) {
        setState(() {
          final currentUserId = AuthService.currentUser?.id;
          _messages = _messages.map((m) {
            if (m.senderId == currentUserId) {
              return ChatMessage(
                id: m.id,
                conversationId: m.conversationId,
                senderId: m.senderId,
                content: m.content,
                rawAttachments: m.rawAttachments,
                isRead: true,
                isRevoked: m.isRevoked,
                createdAt: m.createdAt,
              );
            }
            return m;
          }).toList();
        });
      }
    }));

    _subscriptions.add(socketService.revokedStream.listen((data) {
      debugPrint('[CHATDETAIL] Message revoked via SocketService: $data');
      if (data['conversationId'] == widget.conversation.id && mounted) {
        setState(() {
          final idx = _messages.indexWhere((m) => m.id == data['messageId']);
          if (idx != -1) {
            _messages[idx] = ChatMessage(
              id: _messages[idx].id,
              conversationId: _messages[idx].conversationId,
              senderId: _messages[idx].senderId,
              content: _messages[idx].content,
              rawAttachments: _messages[idx].rawAttachments,
              isRead: _messages[idx].isRead,
              isRevoked: true,
              createdAt: _messages[idx].createdAt,
            );
          }
        });
      }
    }));
  }

  @override
  void dispose() {
    _msgController.dispose();
    _scrollController.dispose();
    _typingTimer?.cancel();
    
    // Emit typing stop before leaving
    SocketService().emit('typing_stop', {
      'recipientId': widget.otherUser.id,
      'conversationId': widget.conversation.id,
      'senderId': AuthService.currentUser?.id ?? '',
    });

    for (var sub in _subscriptions) {
      sub.cancel();
    }
    super.dispose();
  }



  Future<void> _fetchMessages() async {
    final msgs = await MessageService.getMessages(widget.conversation.id);
    if (mounted) {
      setState(() {
        _messages = msgs;
        _isLoading = false;
      });
      _scrollToBottom();
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _pickImage() async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickImage(source: ImageSource.gallery);
      if (pickedFile != null) {
        setState(() {
          _selectedFile = File(pickedFile.path);
          _selectedFileType = 'image';
        });
      }
    } catch (e) {
      debugPrint('Error picking image: $e');
    }
  }

  Future<void> _pickVideo() async {
    try {
      final picker = ImagePicker();
      final pickedFile = await picker.pickVideo(source: ImageSource.gallery);
      if (pickedFile != null) {
        setState(() {
          _selectedFile = File(pickedFile.path);
          _selectedFileType = 'video';
        });
      }
    } catch (e) {
      debugPrint('Error picking video: $e');
    }
  }

  Future<void> _pickFile() async {
    try {
      final result = await FilePicker.pickFiles();
      if (result != null && result.files.single.path != null) {
        setState(() {
          _selectedFile = File(result.files.single.path!);
          _selectedFileType = 'file';
          _isAttachmentMenuOpen = false;
        });
      }
    } catch (e) {
      debugPrint('Error picking file: $e');
    }
  }

  void _toggleAttachmentMenu() {
    setState(() => _isAttachmentMenuOpen = !_isAttachmentMenuOpen);
  }

  Widget _buildMenuItem(String title, IconData icon, VoidCallback onTap) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
            child: Row(
              children: [
                Expanded(child: Text(title, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w400))),
                Icon(icon, color: Colors.white, size: 22),
              ],
            ),
          ),
        ),
        Divider(height: 0.5, color: Colors.white.withValues(alpha: 0.08), indent: 20, endIndent: 20),
      ],
    );
  }

  Widget _buildAttachmentMenu() {
    if (!_isAttachmentMenuOpen) return const SizedBox.shrink();
    return Positioned(
      bottom: MediaQuery.of(context).padding.bottom + 85,
      left: 12,
      child: Material(
        color: Colors.transparent,
        child: GestureDetector(
          onTap: () {},
          child: Container(
            width: 240,
            decoration: BoxDecoration(
              color: const Color(0xFF1C1C1E).withValues(alpha: 0.95),
              borderRadius: BorderRadius.circular(20),
              boxShadow: [
                BoxShadow(color: Colors.black.withValues(alpha: 0.4), blurRadius: 20, spreadRadius: 2)
              ],
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _buildMenuItem('Chia sẻ file', Icons.insert_drive_file_rounded, () {
                  setState(() => _isAttachmentMenuOpen = false);
                  _pickFile();
                }),
                _buildMenuItem('Ảnh & Video', Icons.perm_media_rounded, () {
                  setState(() => _isAttachmentMenuOpen = false);
                  _showMediaPicker();
                }),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showMediaPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: const BorderRadius.only(
            topLeft: Radius.circular(20),
            topRight: Radius.circular(20),
          ),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.image_rounded),
              title: const Text('Chọn ảnh'),
              onTap: () {
                Navigator.pop(context);
                _pickImage();
              },
            ),
            ListTile(
              leading: const Icon(Icons.videocam_rounded),
              title: const Text('Chọn video'),
              onTap: () {
                Navigator.pop(context);
                _pickVideo();
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _sendMessage() async {
    final text = _msgController.text.trim();
    if (text.isEmpty && _selectedFile == null) return;

    if (mounted) setState(() => _isUploading = true);

    List<dynamic> attachments = [];
    if (_selectedFile != null) {
        final uploadResult = await MessageService.uploadAttachment(_selectedFile!);
        if (uploadResult['success']) {
           attachments.add(uploadResult['attachment'] ?? uploadResult['url']);
        } else {
           if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lỗi tải tệp lên')));
              setState(() => _isUploading = false);
           }
           return;
        }
    }

    final newMessage = await MessageService.sendMessage(
      recipientId: widget.otherUser.id,
      content: text,
      attachments: attachments,
    );

    if (mounted) {
      setState(() {
        _msgController.clear();
        _selectedFile = null;
        _selectedFileType = null;
        _isUploading = false;
        // Stop typing when message is sent
        _typingTimer?.cancel();
        SocketService().emit('typing_stop', {
          'recipientId': widget.otherUser.id,
          'conversationId': widget.conversation.id,
          'senderId': AuthService.currentUser?.id ?? '',
        });
      });
      
      if (newMessage != null) {
        setState(() {
          final alreadyExists = _messages.any((m) => m.id == newMessage.id);
          if (!alreadyExists) {
            _messages.add(newMessage);
          }
        });
        _scrollToBottom();
        
        // Emitting via socket
        SocketService().emit('send_message', {
          'recipientId': widget.otherUser.id,
          'message': {
            '_id': newMessage.id,
            'conversation': newMessage.conversationId,
            'sender': newMessage.senderId,
            'content': newMessage.content,
            'attachments': newMessage.rawAttachments,
            'created_at': newMessage.createdAt.toIso8601String(),
          }
        });
      }
    }
  }

  void _handleRevoke(String messageId) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Thu hồi'),
        content: const Text('Thu hồi tin nhắn này?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Thu hồi', style: TextStyle(color: Colors.red))),
        ],
      )
    );

    if (confirm == true) {
      final success = await MessageService.revokeMessage(messageId);
      if (success && mounted) {
        setState(() {
          final idx = _messages.indexWhere((m) => m.id == messageId);
          if (idx != -1) {
            _messages[idx] = ChatMessage(
              id: _messages[idx].id,
              conversationId: _messages[idx].conversationId,
              senderId: _messages[idx].senderId,
              content: _messages[idx].content,
              rawAttachments: _messages[idx].rawAttachments,
              isRead: _messages[idx].isRead,
              isRevoked: true,
              createdAt: _messages[idx].createdAt,
            );
          }
        });
        
        SocketService().emit('revoke_message', {
          'recipientId': widget.otherUser.id,
          'messageId': messageId,
          'conversationId': widget.conversation.id,
        });
      }
    }
  }

  void _handleDeleteConversation() async {
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
      final success = await MessageService.deleteConversation(widget.conversation.id);
      if (success && mounted) {
        if (!mounted) return;
        Navigator.pop(context, true); // Go back to chat list
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

  bool _isImageUrl(String url) {
    final lower = url.toLowerCase();
    return lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.gif') || lower.endsWith('.webp');
  }

  bool _isVideoUrl(String url) {
    final lower = url.toLowerCase();
    return lower.endsWith('.mp4') || lower.endsWith('.mov') || lower.endsWith('.mkv') || lower.endsWith('.avi');
  }

  Future<void> _openAttachment(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }

  void _emitTyping(String value) {
    final recipientId = widget.otherUser.id;
    final conversationId = widget.conversation.id;
    final senderId = AuthService.currentUser?.id ?? '';

    if (value.trim().isNotEmpty) {
      SocketService().emit('typing_start', {
        'recipientId': recipientId,
        'conversationId': conversationId,
        'senderId': senderId,
      });
      _typingTimer?.cancel();
      _typingTimer = Timer(const Duration(seconds: 2), () {
        SocketService().emit('typing_stop', {
          'recipientId': recipientId,
          'conversationId': conversationId,
          'senderId': senderId,
        });
      });
    } else {
      _typingTimer?.cancel();
      SocketService().emit('typing_stop', {
        'recipientId': recipientId,
        'conversationId': conversationId,
        'senderId': senderId,
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final currentUserId = AuthService.currentUser?.id;

    return Scaffold(
      appBar: AppBar(
        title: InkWell(
          onTap: () {
            Navigator.pop(context); // Close chat
            MainLayout.of(context)?.setViewingProfile(widget.otherUser.id);
          },
          child: Row(
            children: [
              CircleAvatar(
                radius: 16,
                backgroundImage: widget.otherUser.fullAvatarUrl != null ? NetworkImage(widget.otherUser.fullAvatarUrl!) : null,
                child: widget.otherUser.fullAvatarUrl == null ? Text(widget.otherUser.fullName[0]) : null,
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(widget.otherUser.fullName, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                    Text('@${widget.otherUser.username}', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withAlpha(150))),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          PopupMenuButton<String>(
            onSelected: (val) {
              if (val == 'delete') _handleDeleteConversation();
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete_outline, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Xóa cuộc trò chuyện', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: Stack(
        children: [
          GestureDetector(
            onTap: () {
              if (_isAttachmentMenuOpen) setState(() => _isAttachmentMenuOpen = false);
            },
            child: Column(
              children: [
                Expanded(
                  child: _isLoading 
                    ? const Center(child: CircularProgressIndicator())
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 16),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg.senderId == currentUserId;

                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: GestureDetector(
                              onLongPress: isMe && !msg.isRevoked ? () => _handleRevoke(msg.id) : null,
                              child: Container(
                                margin: const EdgeInsets.only(bottom: 10),
                                constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
                                decoration: BoxDecoration(
                                  color: isMe 
                                      ? (msg.isRevoked ? Colors.grey.shade400 : Theme.of(context).colorScheme.primary) 
                                      : (msg.isRevoked ? Theme.of(context).dividerColor : Theme.of(context).cardColor),
                                  borderRadius: BorderRadius.circular(18),
                                  border: isMe ? null : Border.all(color: Theme.of(context).dividerColor),
                                ),
                                child: ClipRRect(
                                  borderRadius: BorderRadius.circular(18),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      if (msg.isRevoked)
                                        Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                          child: Text('Tin nhắn đã được thu hồi', style: TextStyle(fontStyle: FontStyle.italic, color: isMe ? Colors.white70 : Colors.grey.shade500)),
                                        )
                                      else ...[
                                        if (msg.parsedAttachments.isNotEmpty)
                                          ...msg.parsedAttachments.map((attachment) {
                                            final String url = attachment['url'];
                                            final String kind = attachment['kind'];
                                            final String name = attachment['name'];
                                            
                                            if (kind == 'image' || _isImageUrl(url)) {
                                              return ConstrainedBox(
                                                constraints: const BoxConstraints(maxHeight: 350),
                                                child: GestureDetector(
                                                  onTap: () {
                                                    Navigator.push(context, MaterialPageRoute(
                                                      builder: (_) => ImageFullScreenView(
                                                        imageUrl: url, 
                                                        messageId: msg.id,
                                                        recipientId: widget.otherUser.id,
                                                      )
                                                    ));
                                                  },
                                                  child: Image.network(url, fit: BoxFit.cover, width: double.infinity),
                                                ),
                                              );
                                            } else if (kind == 'video' || _isVideoUrl(url)) {
                                              return ConstrainedBox(
                                                constraints: const BoxConstraints(maxHeight: 350),
                                                child: InlineVideoPlayer(
                                                  videoUrl: url,
                                                  messageId: msg.id,
                                                  recipientId: widget.otherUser.id,
                                                ),
                                              );
                                            } else {
                                              return Padding(
                                                padding: const EdgeInsets.all(10),
                                                child: GestureDetector(
                                                  onTap: () => _openAttachment(url),
                                                  child: Container(
                                                    padding: const EdgeInsets.all(10),
                                                    decoration: BoxDecoration(
                                                      color: Colors.black12,
                                                      borderRadius: BorderRadius.circular(8),
                                                      border: Border.all(color: Colors.white24),
                                                    ),
                                                    child: Row(
                                                      mainAxisSize: MainAxisSize.min,
                                                      children: [
                                                        Icon(Icons.insert_drive_file, color: isMe ? Colors.white : Theme.of(context).colorScheme.primary, size: 28),
                                                        const SizedBox(width: 8),
                                                        Flexible(
                                                          child: Text(
                                                            name,
                                                            maxLines: 1,
                                                            overflow: TextOverflow.ellipsis,
                                                            style: TextStyle(
                                                              color: isMe ? Colors.white : Theme.of(context).colorScheme.onSurface,
                                                              decoration: TextDecoration.underline,
                                                            ),
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ),
                                              );
                                            }
                                          }),
                                        if (msg.content.isNotEmpty)
                                          Padding(
                                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                                            child: Text(
                                              msg.content, 
                                              style: TextStyle(color: isMe ? Colors.white : Theme.of(context).colorScheme.onSurface)
                                            ),
                                          ),
                                      ]
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                    ),
                ),
                
                if (_isOtherUserTyping)
                   Padding(
                     padding: const EdgeInsets.only(left: 16, bottom: 6),
                     child: Row(
                       children: [
                         Container(
                           padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                           decoration: BoxDecoration(
                             color: Theme.of(context).cardColor,
                             borderRadius: BorderRadius.circular(18),
                             border: Border.all(color: Theme.of(context).dividerColor),
                           ),
                           child: Row(
                             mainAxisSize: MainAxisSize.min,
                             children: [
                               _TypingDot(delay: 0),
                               const SizedBox(width: 4),
                               _TypingDot(delay: 150),
                               const SizedBox(width: 4),
                               _TypingDot(delay: 300),
                             ],
                           ),
                         ),
                       ],
                     ),
                   ),

                if (_selectedFile != null)
                   Container(
                     color: Theme.of(context).cardColor,
                     padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                     child: Row(
                       children: [
                         Stack(
                           children: [
                             Container(
                               height: 80, width: 80,
                               decoration: BoxDecoration(
                                 color: Theme.of(context).scaffoldBackgroundColor,
                                 borderRadius: BorderRadius.circular(12),
                                 border: Border.all(color: Theme.of(context).dividerColor),
                               ),
                               child: _selectedFileType == 'image'
                                   ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(_selectedFile!, fit: BoxFit.cover))
                                   : Center(child: Icon(_selectedFileType == 'video' ? Icons.videocam : Icons.insert_drive_file, size: 40, color: Theme.of(context).colorScheme.primary)),
                             ),
                             Positioned(
                               right: 4, top: 4,
                               child: GestureDetector(
                                 onTap: () => setState(() { _selectedFile = null; _selectedFileType = null; }),
                                 child: Container(
                                   padding: const EdgeInsets.all(4),
                                   decoration: const BoxDecoration(color: Colors.black54, shape: BoxShape.circle),
                                   child: const Icon(Icons.close, color: Colors.white, size: 14),
                                 ),
                               ),
                             )
                           ],
                         ),
                       ],
                     ),
                   ),
                   
                Container(
                  padding: EdgeInsets.only(
                    left: 12, 
                    right: 12, 
                    top: 10, 
                    bottom: MediaQuery.of(context).padding.bottom + 10
                  ),
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    border: Border(top: BorderSide(color: Theme.of(context).dividerColor)),
                  ),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      IconButton(
                        icon: AnimatedSwitcher(
                          duration: const Duration(milliseconds: 200),
                          transitionBuilder: (child, animation) => RotationTransition(
                            turns: animation,
                            child: ScaleTransition(scale: animation, child: child),
                          ),
                          child: Icon(
                            _isAttachmentMenuOpen ? Icons.close_rounded : Icons.add_circle_outline_rounded,
                            key: ValueKey(_isAttachmentMenuOpen),
                            size: 28,
                          ),
                        ),
                        color: _isAttachmentMenuOpen ? Colors.grey : Theme.of(context).colorScheme.primary,
                        onPressed: _toggleAttachmentMenu,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          decoration: BoxDecoration(
                            color: Theme.of(context).brightness == Brightness.light ? Colors.grey.shade100 : const Color(0xFF1E293B),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(color: Theme.of(context).dividerColor.withAlpha((0.3 * 255).round())),
                          ),
                          child: TextField(
                            controller: _msgController,
                            maxLines: 4,
                            minLines: 1,
                            style: TextStyle(fontSize: 15, color: Theme.of(context).colorScheme.onSurface),
                            onTap: () {
                               if (_isAttachmentMenuOpen) setState(() => _isAttachmentMenuOpen = false);
                            },
                            onChanged: _emitTyping,
                            decoration: InputDecoration(
                              hintText: 'Nhập tin nhắn...',
                              hintStyle: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha((0.4 * 255).round()), fontSize: 15),
                              border: InputBorder.none,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      _isUploading
                        ? const Padding(padding: EdgeInsets.all(12), child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2)))
                        : Container(
                            margin: const EdgeInsets.only(bottom: 2),
                            decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary, shape: BoxShape.circle),
                            child: IconButton(
                              icon: const Icon(Icons.send_rounded, color: Colors.white, size: 20),
                              padding: const EdgeInsets.all(10),
                              constraints: const BoxConstraints(),
                              onPressed: _sendMessage,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          _buildAttachmentMenu(),
        ],
      ),
    );
  }
}

class InlineVideoPlayer extends StatelessWidget {
  final String videoUrl;
  final String messageId;
  final String recipientId;
  const InlineVideoPlayer({super.key, required this.videoUrl, required this.messageId, required this.recipientId});

  @override
  Widget build(BuildContext context) {
    return Container(
      constraints: const BoxConstraints(maxHeight: 200),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(12),
        child: VideoPlayerWidget(
          videoUrl: videoUrl,
          autoPlay: false,
          looping: true,
          muted: true,
          onTap: () {
            Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => VideoFullScreenView(
                  videoUrl: videoUrl,
                  messageId: messageId,
                  recipientId: recipientId,
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}

class VideoFullScreenView extends StatefulWidget {
  final String videoUrl;
  final String messageId;
  final String recipientId;
  const VideoFullScreenView({super.key, required this.videoUrl, required this.messageId, required this.recipientId});

  @override
  State<VideoFullScreenView> createState() => _VideoFullScreenViewState();
}

class _VideoFullScreenViewState extends State<VideoFullScreenView> {
  late VideoPlayerController _controller;
  bool _showControls = true;
  bool _isInit = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl));
    _controller.initialize().then((_) {
      if (mounted) {
        setState(() => _isInit = true);
        _controller.play();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, "0");
    String minutes = twoDigits(duration.inMinutes.remainder(60));
    String seconds = twoDigits(duration.inSeconds.remainder(60));
    return "$minutes:$seconds";
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          // Video
          Center(
            child: _isInit
                ? AspectRatio(
                    aspectRatio: _controller.value.aspectRatio,
                    child: GestureDetector(
                      onTap: () => setState(() => _showControls = !_showControls),
                      child: VideoPlayer(_controller),
                    ),
                  )
                : const CircularProgressIndicator(color: Colors.white),
          ),
          
          // Controls
          if (_showControls) ...[
            // Top bar
            Positioned(
              top: MediaQuery.of(context).padding.top + 10,
              left: 10,
              right: 10,
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const Spacer(),
                  IconButton(
                    icon: const Icon(Icons.download_rounded, color: Colors.white),
                    onPressed: () => MediaUtils.downloadVideo(context, widget.videoUrl),
                  ),
                  IconButton(
                    icon: const Icon(Icons.shortcut_rounded, color: Colors.white),
                    onPressed: () {
                      showModalBottomSheet(
                        context: context,
                        backgroundColor: Theme.of(context).cardColor,
                        shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                        builder: (context) => ForwardMessageModal(messageId: widget.messageId),
                      );
                    },
                  ),
                ],
              ),
            ),
            
            // Center Play/Pause & Seek
            Center(
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  IconButton(
                    icon: const Icon(Icons.replay_10_rounded, color: Colors.white, size: 40),
                    onPressed: () => _controller.seekTo(_controller.value.position - const Duration(seconds: 10)),
                  ),
                  const SizedBox(width: 30),
                  IconButton(
                    icon: Icon(
                      _controller.value.isPlaying ? Icons.pause_rounded : Icons.play_arrow_rounded,
                      color: Colors.white,
                      size: 60,
                    ),
                    onPressed: () {
                      setState(() {
                        _controller.value.isPlaying ? _controller.pause() : _controller.play();
                      });
                    },
                  ),
                  const SizedBox(width: 30),
                  IconButton(
                    icon: const Icon(Icons.forward_10_rounded, color: Colors.white, size: 40),
                    onPressed: () => _controller.seekTo(_controller.value.position + const Duration(seconds: 10)),
                  ),
                ],
              ),
            ),

            // Bottom bar
            Positioned(
              bottom: MediaQuery.of(context).padding.bottom + 20,
              left: 20,
              right: 20,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  if (_isInit)
                    VideoProgressIndicator(
                      _controller,
                      allowScrubbing: true,
                      colors: const VideoProgressColors(
                        playedColor: Colors.red,
                        bufferedColor: Colors.white24,
                        backgroundColor: Colors.white12,
                      ),
                    ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Text(
                        "${_formatDuration(_controller.value.position)} / ${_formatDuration(_controller.value.duration)}",
                        style: const TextStyle(color: Colors.white, fontSize: 12),
                      ),
                      const Spacer(),
                      IconButton(
                        icon: Icon(
                          _controller.value.volume > 0 ? Icons.volume_up_rounded : Icons.volume_off_rounded,
                          color: Colors.white,
                          size: 20,
                        ),
                        onPressed: () {
                          setState(() {
                            _controller.setVolume(_controller.value.volume > 0 ? 0 : 1);
                          });
                        },
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class ImageFullScreenView extends StatelessWidget {
  final String imageUrl;
  final String messageId;
  final String recipientId;

  const ImageFullScreenView({
    super.key, 
    required this.imageUrl, 
    required this.messageId, 
    required this.recipientId,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      body: Stack(
        children: [
          Center(
            child: InteractiveViewer(
              minScale: 0.5,
              maxScale: 4.0,
              child: Image.network(imageUrl, fit: BoxFit.contain),
            ),
          ),
          Positioned(
            top: MediaQuery.of(context).padding.top + 10,
            left: 10,
            right: 10,
            child: Row(
              children: [
                IconButton(
                  icon: const Icon(Icons.close, color: Colors.white),
                  onPressed: () => Navigator.pop(context),
                ),
                const Spacer(),
                IconButton(
                  icon: const Icon(Icons.download_rounded, color: Colors.white),
                  onPressed: () => MediaUtils.downloadImage(context, imageUrl),
                ),
                IconButton(
                  icon: const Icon(Icons.shortcut_rounded, color: Colors.white),
                  onPressed: () {
                    showModalBottomSheet(
                      context: context,
                      backgroundColor: Theme.of(context).cardColor,
                      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
                      builder: (context) => ForwardMessageModal(messageId: messageId),
                    );
                  },
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TypingDot extends StatefulWidget {
  final int delay;
  const _TypingDot({required this.delay});

  @override
  State<_TypingDot> createState() => _TypingDotState();
}

class _TypingDotState extends State<_TypingDot> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: const Duration(milliseconds: 600));
    _animation = Tween<double>(begin: 0, end: 1).animate(CurvedAnimation(parent: _controller, curve: Curves.easeInOut));
    
    Future.delayed(Duration(milliseconds: widget.delay), () {
      if (mounted) _controller.repeat(reverse: true);
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return FadeTransition(
      opacity: _animation,
      child: Container(
        width: 6,
        height: 6,
        decoration: BoxDecoration(color: Theme.of(context).colorScheme.primary.withAlpha(180), shape: BoxShape.circle),
      ),
    );
  }
}
