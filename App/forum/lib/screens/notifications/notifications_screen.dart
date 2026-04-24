import 'package:flutter/material.dart';
import '../../services/notification_service.dart';
import '../../models/notification.dart';
import 'dart:async';
import 'package:timeago/timeago.dart' as timeago;
import '../post/comment_screen.dart';
import '../profile/profile_screen.dart';
import '../../services/post_service.dart';
import '../../utils/responsive.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<NotificationModel> _notifications = [];
  bool _isLoading = true;
  StreamSubscription? _subscription;
  String _activeFilter = 'all';

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
    _subscription = NotificationService.onNewNotification.listen((_) {
      _fetchNotifications();
    });
  }

  @override
  void dispose() {
    _subscription?.cancel();
    super.dispose();
  }

  Future<void> _fetchNotifications({bool showLoading = true}) async {
    if (showLoading) setState(() => _isLoading = true);
    final data = await NotificationService.getNotifications();
    if (mounted) {
      setState(() {
        _notifications = data.map((n) => NotificationModel.fromJson(n)).toList();
        if (showLoading) _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth > 800;

    final filteredNotifications = _notifications.where((n) {
      if (_activeFilter == 'unread') return !n.isRead;
      if (_activeFilter == 'social') return n.type == 'friend_request' || n.type == 'follow';
      if (_activeFilter == 'content') return n.type != 'friend_request' && n.type != 'follow';
      return true;
    }).toList();

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Thông báo', style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 18.sp(context))),
        backgroundColor: Theme.of(context).cardColor,
        elevation: 1,
        actions: [
          TextButton(
            onPressed: () async {
              final success = await NotificationService.markAllAsRead();
              if (success) {
                NotificationService.notifyReadNotifications();
                _fetchNotifications();
              }
            },
            child: const Text('Đánh dấu đã đọc tất cả', style: TextStyle(color: Color(0xFFD32F2F))),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _isLoading 
        ? const Center(child: CircularProgressIndicator())
        : Column(
            children: [
              _buildFilterChips(),
              Expanded(
                child: RefreshIndicator(
                  onRefresh: _fetchNotifications,
                  child: _notifications.isEmpty
                    ? ListView(children: [
                        const SizedBox(height: 100),
                        Center(
                          child: Card(
                            margin: const EdgeInsets.symmetric(horizontal: 20),
                            elevation: 0,
                            color: Theme.of(context).cardColor,
                            child: Padding(
                              padding: const EdgeInsets.all(32.0),
                              child: Column(
                                children: [
                                  Text('Hiện chưa có thông báo nào', style: TextStyle(fontSize: 16.sp(context), fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                                  const SizedBox(height: 8),
                                  Text('Khi có ai đó tương tác với bạn, mọi cập nhật sẽ hiện ở đây.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey, fontSize: 12.sp(context))),
                                ],
                              ),
                            ),
                          ),
                        ),
                      ])
                    : filteredNotifications.isEmpty
                        ? ListView(children: [
                            const SizedBox(height: 100),
                            Center(
                              child: Card(
                                margin: const EdgeInsets.symmetric(horizontal: 20),
                                elevation: 0,
                                color: Theme.of(context).cardColor,
                                child: Padding(
                                  padding: const EdgeInsets.all(32.0),
                                  child: Column(
                                    children: [
                                      Text('Không có thông báo phù hợp', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                                      const SizedBox(height: 8),
                                      const Text('Thử đổi bộ lọc để xem thêm hoạt động.', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey)),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ])
                        : Center(
                            child: Container(
                              constraints: const BoxConstraints(maxWidth: 800),
                              padding: EdgeInsets.all(isDesktop ? 24.0 : 0.0),
                              child: Container(
                                decoration: BoxDecoration(
                                  color: Theme.of(context).cardColor,
                                  borderRadius: BorderRadius.circular(isDesktop ? 12 : 0),
                                  border: isDesktop ? Border.all(color: Theme.of(context).dividerColor) : null,
                                ),
                                child: ListView.builder(
                                  itemCount: filteredNotifications.length + (_activeFilter == 'all' && filteredNotifications.every((n) => n.isRead) ? 1 : 0),
                                  itemBuilder: (context, index) {
                                    if (index == filteredNotifications.length) {
                                      return Padding(
                                        padding: const EdgeInsets.all(16.0),
                                        child: Card(
                                          elevation: 0,
                                          color: Theme.of(context).scaffoldBackgroundColor,
                                          margin: EdgeInsets.zero,
                                          child: Padding(
                                            padding: const EdgeInsets.all(32.0),
                                            child: Column(
                                              children: [
                                                Text('Bạn đã xem hết thông báo', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                                                const SizedBox(height: 8),
                                                const Text('Có hoạt động mới, danh sách sẽ tự động cập nhật.', style: TextStyle(color: Colors.grey, fontSize: 13)),
                                              ],
                                            ),
                                          ),
                                        ),
                                      );
                                    }
                                    final notif = filteredNotifications[index];
                                    return _buildNotificationItem(notif);
                                  },
                                ),
                              ),
                            ),
                          ),
                ),
              ),
            ],
          ),
    );
  }

  Widget _buildFilterChips() {
    final filters = [
      {'id': 'all', 'label': 'Tất cả'},
      {'id': 'unread', 'label': 'Chưa đọc'},
      {'id': 'social', 'label': 'Kết nối'},
      {'id': 'content', 'label': 'Nội dung'},
    ];

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      color: Theme.of(context).cardColor,
      width: double.infinity,
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: Row(
          children: filters.map((filter) {
            final isSelected = _activeFilter == filter['id'];
            return Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: ChoiceChip(
                label: Text(filter['label']!),
                selected: isSelected,
                onSelected: (selected) {
                  if (selected) {
                    setState(() => _activeFilter = filter['id']!);
                  }
                },
                backgroundColor: Theme.of(context).scaffoldBackgroundColor,
                selectedColor: Theme.of(context).colorScheme.primary,
                labelStyle: TextStyle(
                  color: isSelected ? Theme.of(context).colorScheme.onPrimary : Theme.of(context).colorScheme.onSurface,
                  fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                ),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                  side: BorderSide(color: isSelected ? Colors.transparent : Theme.of(context).dividerColor),
                ),
                showCheckmark: false,
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildNotificationItem(NotificationModel notif) {
    IconData iconData;
    Color iconColor;
    Color iconBgColor;
    String contextText;

    switch (notif.type) {
      case 'like':
      case 'upvote':
        if (notif.content == null || notif.content!.isEmpty) {
          iconData = Icons.arrow_upward;
          iconColor = Colors.orange;
          iconBgColor = Theme.of(context).brightness == Brightness.light ? Colors.orange.shade50 : Colors.orange.shade900.withAlpha((0.3 * 255).round());
          contextText = ' đã upvote bài viết của bạn';
        } else {
          iconData = Icons.favorite;
          iconColor = const Color(0xFFD32F2F);
          iconBgColor = Theme.of(context).brightness == Brightness.light ? const Color(0xFFFDE8E8) : const Color(0xFF450A0A);
          contextText = ''; // Phrasings like "đã chấp nhận kết bạn" are in content
        }
        break;
      case 'comment':
        iconData = Icons.chat_bubble_outline;
        iconColor = Colors.blue;
        iconBgColor = Theme.of(context).brightness == Brightness.light ? Colors.blue.shade50 : Colors.blue.shade900.withAlpha((0.3 * 255).round());
        contextText = ' đã bình luận về bài viết';
        break;
      case 'mention':
        iconData = Icons.message_outlined;
        iconColor = Colors.purple;
        iconBgColor = Theme.of(context).brightness == Brightness.light ? Colors.purple.shade50 : Colors.purple.shade900.withAlpha((0.3 * 255).round());
        contextText = ' đã nhắc đến bạn trong một bình luận';
        break;
      case 'friend_request':
        iconData = Icons.person_add_alt_1;
        iconColor = Colors.green;
        iconBgColor = Theme.of(context).brightness == Brightness.light ? Colors.green.shade50 : Colors.green.shade900.withAlpha((0.3 * 255).round());
        contextText = ' đã gửi cho bạn một lời mời kết bạn';
        break;
      case 'follow':
        iconData = Icons.person_add;
        iconColor = const Color(0xFFD32F2F);
        iconBgColor = Theme.of(context).brightness == Brightness.light ? const Color(0xFFFDE8E8) : const Color(0xFF450A0A);
        contextText = ' đã bắt đầu theo dõi bạn';
        break;
      case 'trending':
        iconData = Icons.trending_up;
        iconColor = Colors.amber;
        iconBgColor = Theme.of(context).brightness == Brightness.light ? Colors.amber.shade50 : Colors.amber.shade900.withAlpha((0.3 * 255).round());
        contextText = ' Bài viết đang thịnh hành';
        break;
      case 'system':
        iconData = Icons.shield_outlined;
        iconColor = const Color(0xFFD32F2F);
        iconBgColor = Theme.of(context).brightness == Brightness.light ? const Color(0xFFFDE8E8) : const Color(0xFF450A0A);
        contextText = ' (Thông báo hệ thống)';
        break;
      default:
        iconData = Icons.notifications_none;
        iconColor = Colors.grey;
        iconBgColor = Theme.of(context).dividerColor;
        contextText = ' có thông báo mới';
    }

    return InkWell(
      onTap: () async {
        if (!notif.isRead) {
          final success = await NotificationService.markAsRead(notif.id);
          if (success) {
            NotificationService.notifyReadNotifications();
            _fetchNotifications(showLoading: false);
          }
        }

        // Navigation logic
        if (!mounted) return;

        if (notif.type == 'follow') {
          if (notif.senderId != null) {
            Navigator.of(context).push(
              MaterialPageRoute(builder: (_) => ProfileScreen(userId: notif.senderId)),
            );
          }
        } else if (notif.postId != null) {
          // Show loading
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (ctx) => const Center(child: CircularProgressIndicator(color: Colors.white)),
          );

          try {
            final post = await PostService.getPostById(notif.postId!);
            
            if (mounted) {
              Navigator.of(context).pop(); // Close loading dialog
              
              if (post != null) {
                showModalBottomSheet(
                  context: context,
                  isScrollControlled: true,
                  useSafeArea: true,
                  backgroundColor: Colors.transparent,
                  builder: (context) => ClipRRect(
                    borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
                    child: CommentScreen(post: post),
                  ),
                );
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Không thể tải bài viết này.')),
                );
              }
            }
          } catch (e) {
            if (mounted) {
              Navigator.of(context).pop(); // Close loading dialog
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Lỗi: $e')),
              );
            }
          }
        }
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        decoration: BoxDecoration(
          color: notif.isRead ? Theme.of(context).cardColor : (Theme.of(context).brightness == Brightness.light ? const Color(0xFFF0F7FF) : const Color(0xFF1E293B)), 
          border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor.withAlpha(50))),
        ),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                CircleAvatar(
                  radius: 20.sp(context),
                  backgroundImage: NetworkImage(notif.senderAvatar ?? 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100'),
                ),
                Positioned(
                  bottom: -4,
                  right: -4,
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: iconBgColor,
                      shape: BoxShape.circle,
                      border: Border.all(color: Theme.of(context).cardColor, width: 2),
                    ),
                    child: Icon(iconData, size: 12, color: iconColor),
                  ),
                ),
              ],
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  RichText(
                    text: TextSpan(
                      style: TextStyle(fontSize: 13.sp(context), color: Theme.of(context).colorScheme.onSurface, height: 1.4),
                      children: [
                        TextSpan(text: '${notif.senderName} ', style: const TextStyle(fontWeight: FontWeight.bold)),
                        TextSpan(text: contextText, style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()))),
                      ],
                    ),
                  ),
                  if (notif.postTitle != null) ...[
                    const SizedBox(height: 4),
                    Text(
                      '"${notif.postTitle}"',
                      style: TextStyle(fontWeight: FontWeight.w500, fontSize: 13, fontStyle: FontStyle.italic, color: Theme.of(context).colorScheme.onSurface),
                      maxLines: 1, overflow: TextOverflow.ellipsis,
                    ),
                  ],
                  if (notif.content != null && notif.content!.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Theme.of(context).dividerColor.withAlpha((0.05 * 255).round()),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: Theme.of(context).dividerColor.withAlpha((0.2 * 255).round())),
                      ),
                      child: Text(
                        notif.content!,
                        style: TextStyle(
                          fontSize: 13,
                          color: Theme.of(context).colorScheme.onSurface.withAlpha((0.85 * 255).round()),
                          height: 1.4,
                        ),
                      ),
                    ),
                  ],
                  if (notif.type == 'friend_request' && !notif.isRead) ...[
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        ElevatedButton(
                          onPressed: () async {
                            if (notif.senderId != null) {
                              final success = await NotificationService.acceptFriendRequest(notif.senderId!);
                              if (success) {
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã chấp nhận kết bạn!')));
                                  NotificationService.markAsRead(notif.id);
                                  _fetchNotifications(showLoading: false);
                                  NotificationService.notifyReadNotifications();
                                }
                              }
                            }
                          },
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            minimumSize: const Size(80, 32),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          ),
                          child: const Text('Đồng ý', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(width: 8),
                        OutlinedButton(
                          onPressed: () async {
                            if (notif.senderId != null) {
                              final success = await NotificationService.rejectFriendRequest(notif.senderId!);
                              if (success) {
                                if (mounted) {
                                  ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã từ chối lời mời.')));
                                  NotificationService.markAsRead(notif.id);
                                  _fetchNotifications(showLoading: false);
                                  NotificationService.notifyReadNotifications();
                                }
                              }
                            }
                          },
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            minimumSize: const Size(80, 32),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            side: BorderSide(color: Theme.of(context).dividerColor),
                          ),
                          child: Text('Từ chối', style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()))),
                        ),
                      ],
                    ),
                  ],
                  const SizedBox(height: 8),
                  Text(timeago.format(notif.createdAt, locale: 'vi'), style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()), fontSize: 12)),
                ],
              ),
            ),
            if (!notif.isRead)
              Container(
                width: 10,
                height: 10,
                margin: const EdgeInsets.only(top: 8, left: 8),
                decoration: const BoxDecoration(
                  color: Color(0xFFD32F2F),
                  shape: BoxShape.circle,
                ),
              )
          ],
        ),
      ),
    );
  }
}
