import 'package:flutter/material.dart';
import '../../models/conversation.dart';
import '../../services/message_service.dart';
import '../../services/auth_service.dart';

class ForwardMessageModal extends StatefulWidget {
  final String messageId;
  const ForwardMessageModal({super.key, required this.messageId});

  @override
  State<ForwardMessageModal> createState() => _ForwardMessageModalState();
}

class _ForwardMessageModalState extends State<ForwardMessageModal> {
  List<Conversation> _conversations = [];
  bool _isLoading = true;
  final Set<String> _sentRecipients = {};

  @override
  void initState() {
    super.initState();
    _loadConversations();
  }

  Future<void> _loadConversations() async {
    final convs = await MessageService.getConversations();
    if (mounted) {
      setState(() {
        _conversations = convs;
        _isLoading = false;
      });
    }
  }

  Future<void> _forwardTo(Conversation conv) async {
    final currentUserId = AuthService.currentUser?.id;
    final otherUser = conv.participants.firstWhere((p) => p.id != currentUserId);
    
    // Prevent multiple forwards to same user in one go
    if (_sentRecipients.contains(otherUser.id)) return;
    
    setState(() => _sentRecipients.add(otherUser.id));
    
    final result = await MessageService.shareMessage(
      messageId: widget.messageId, 
      recipientId: otherUser.id,
    );
    
    if (result != null && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Đã gửi tới ${otherUser.fullName}')));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.7,
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text('Chuyển tiếp tới', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
            ],
          ),
          const SizedBox(height: 10),
          Expanded(
            child: _isLoading 
              ? const Center(child: CircularProgressIndicator())
              : ListView.builder(
                  itemCount: _conversations.length,
                  itemBuilder: (context, index) {
                    final conv = _conversations[index];
                    final currentUserId = AuthService.currentUser?.id;
                    final otherUser = conv.participants.firstWhere((p) => p.id != currentUserId, orElse: () => conv.participants.first);
                    
                    final isSent = _sentRecipients.contains(otherUser.id);
                    
                    return ListTile(
                      leading: CircleAvatar(
                        backgroundImage: otherUser.fullAvatarUrl != null ? NetworkImage(otherUser.fullAvatarUrl!) : null,
                        child: otherUser.fullAvatarUrl == null ? Text(otherUser.fullName[0]) : null,
                      ),
                      title: Text(otherUser.fullName, style: const TextStyle(fontWeight: FontWeight.w600)),
                      trailing: isSent 
                          ? const Text('Đã gửi', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold))
                          : ElevatedButton(
                              onPressed: () => _forwardTo(conv),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Theme.of(context).colorScheme.primary,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              ),
                              child: const Text('Gửi'),
                            ),
                    );
                  },
                ),
          ),
        ],
      ),
    );
  }
}
