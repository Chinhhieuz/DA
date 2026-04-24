import 'dart:async';
import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../services/notification_service.dart';
import '../../services/socket_service.dart';
import '../post/create_post_screen.dart';
import '../info/rules_screen.dart';
import '../info/feedback_screen.dart';
import '../notifications/notifications_screen.dart';
import '../profile/profile_screen.dart';
import '../profile/settings_screen.dart';
import '../community/community_list_screen.dart';
import '../post/saved_posts_screen.dart';
import 'home_screen.dart';
import 'search_screen.dart';
import '../auth/login_screen.dart';
import '../chat/chat_list_screen.dart';
import '../../services/message_service.dart';
import '../../services/post_service.dart';
import '../../utils/responsive.dart';

class MainLayout extends StatefulWidget {
  final int initialIndex;
  const MainLayout({super.key, this.initialIndex = 0});

  static MainLayoutState? of(BuildContext context) => 
      context.findAncestorStateOfType<MainLayoutState>();

  @override
  State<MainLayout> createState() => MainLayoutState();
}

class MainLayoutState extends State<MainLayout> {
  int _currentIndex = 0;
  int _sidebarFilter = 0; // 0=Mới nhất, 1=Phổ biến, 2=Top
  final FocusNode _searchFocus = FocusNode();
  final TextEditingController _searchController = TextEditingController();
  String? _viewingProfileId;
  final String _searchQuery = '';
  StreamSubscription? _readSubscription;

  void setIndex(int index) {
    setState(() {
      _currentIndex = index;
      if (index == 3) {
        NotificationService.markAllAsRead();
        NotificationService.notifyReadNotifications();
      }
    });
  }

  void setViewingProfile(String? userId) {
    setState(() {
      _viewingProfileId = userId;
      _currentIndex = 4;
    });
  }

  List<Widget> get _screens {
    String feedTitle = 'Mới nhất';
    if (_sidebarFilter == 1) feedTitle = 'Phổ biến';
    if (_sidebarFilter == 2) feedTitle = 'Top';
    if (_sidebarFilter == 3) feedTitle = 'Đã lưu';

    return [
      HomeScreen(feedTitle: feedTitle, searchQuery: _searchQuery), // 0
      const ChatListScreen(),                // 1
      const CreatePostScreen(),              // 2
      const NotificationsScreen(),           // 3
      ProfileScreen(userId: _viewingProfileId), // 4
      const SettingsScreen(),                // 5
      const RulesScreen(),                   // 6
      const FeedbackScreen(),                // 7
      const CommunityListScreen(),           // 8
      const SavedPostsScreen(),              // 9
    ];
  }

  @override
  void dispose() {
    _searchFocus.dispose();
    _searchController.dispose();
    SocketService().disconnect();
    _readSubscription?.cancel();
    super.dispose();
  }

  void _onSearchFocusChange() {
    if (_searchFocus.hasFocus) {
      _searchFocus.unfocus();
      Navigator.of(context).push(MaterialPageRoute(
        builder: (_) => const SearchScreen(),
      ));
    }
  }

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex;
    _searchFocus.addListener(_onSearchFocusChange);
    NotificationService.fetchUnreadCount();
    MessageService.fetchUnreadCount();
    _initSocket();
    _readSubscription = NotificationService.onReadNotifications.listen((_) {
      // Unread count is handled by NotificationService.unreadCount notifier
    });
  }

  void _initSocket() {
    final socketService = SocketService();
    socketService.connect();

    socketService.messageStream.listen((data) {
      debugPrint('📩 MainLayout Received message for badge');
      if (mounted) {
        MessageService.fetchUnreadCount();
      }
    });

    socketService.seenStream.listen((data) {
      debugPrint('👁️ MainLayout Received seen for badge');
      if (mounted) {
        MessageService.fetchUnreadCount();
        NotificationService.notifyReadNotifications();
      }
    });

    socketService.notificationStream.listen((data) {
      debugPrint('🔔 MainLayout New notification: $data');
      if (mounted) {
        try {
          NotificationService.fetchUnreadCount();
          _showNotificationSnackBar(data);
        } catch (e) {
          debugPrint('❌ Error handling notification in MainLayout: $e');
        }
      }
    });

    socketService.postAiResultStream.listen((data) {
      debugPrint('🤖 MainLayout post_ai_result: $data');
      if (!mounted) return;
      final status = data['status']?.toString();
      if (status == 'approved') {
        // Increment notifier → HomeScreen will re-fetch the feed
        PostService.refreshFeedNotifier.value++;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: const Row(
              children: [
                Icon(Icons.check_circle, color: Colors.white, size: 18),
                SizedBox(width: 10),
                Text('Bài viết của bạn đã được đăng thành công!'),
              ],
            ),
            backgroundColor: Colors.green.shade600,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(12),
            duration: const Duration(seconds: 4),
          ),
        );
      } else if (status == 'pending' || status == 'rejected') {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Row(
              children: [
                const Icon(Icons.warning_amber_rounded, color: Colors.white, size: 18),
                const SizedBox(width: 10),
                Expanded(child: Text('Bài viết cần được kiểm duyệt thêm: ${data['reason'] ?? ''}', maxLines: 2, overflow: TextOverflow.ellipsis)),
              ],
            ),
            backgroundColor: Colors.orange.shade700,
            behavior: SnackBarBehavior.floating,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            margin: const EdgeInsets.all(12),
            duration: const Duration(seconds: 5),
          ),
        );
      }
    });
  }

  void _showNotificationSnackBar(Map<String, dynamic> data) {
    try {
      IconData iconData;
      Color iconColor;
      String message;

      final type = data['type']?.toString();
      final senderName = data['senderName']?.toString() ?? 'Ai đó';

      switch (type) {
        case 'like':
        case 'upvote':
          if (data['content'] == null || (data['content'] as String).isEmpty) {
            iconData = Icons.arrow_upward;
            iconColor = Colors.orange;
            message = '$senderName đã upvote bài viết của bạn';
          } else {
            iconData = Icons.favorite;
            iconColor = const Color(0xFFD32F2F);
            message = '$senderName ${data['content']}';
          }
          break;
        case 'comment':
          iconData = Icons.chat_bubble_outline;
          iconColor = Colors.blue;
          message = '$senderName đã bình luận về bài viết';
          break;
        case 'mention':
          iconData = Icons.message_outlined;
          iconColor = Colors.purple;
          message = '$senderName đã nhắc đến bạn trong một bình luận';
          break;
        case 'friend_request':
          iconData = Icons.person_add_alt_1;
          iconColor = Colors.green;
          message = '$senderName đã gửi cho bạn một lời mời kết bạn';
          break;
        case 'follow':
          iconData = Icons.person_add;
          iconColor = const Color(0xFFD32F2F);
          message = '$senderName đã bắt đầu theo dõi bạn';
          break;
        case 'trending':
          iconData = Icons.trending_up;
          iconColor = Colors.amber;
          message = 'Bài viết đang thịnh hành: ${data['postTitle'] ?? ""}';
          break;
        case 'system':
          iconData = Icons.shield_outlined;
          iconColor = const Color(0xFFD32F2F);
          message = 'Thông báo hệ thống: ${data['content'] ?? ""}';
          break;
        default:
          iconData = Icons.notifications_none;
          iconColor = Colors.grey;
          message = data['content'] ?? 'Bạn có thông báo mới';
      }

      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: InkWell(
            onTap: () {
              ScaffoldMessenger.of(context).hideCurrentSnackBar();
              setIndex(3);
            },
            child: Row(
              children: [
                Icon(iconData, color: iconColor, size: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Text(
                    message,
                    style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13),
                  ),
                ),
                const SizedBox(width: 8),
                const Text('Xem', style: TextStyle(color: Color(0xFFD32F2F), fontWeight: FontWeight.bold, fontSize: 13)),
              ],
            ),
          ),
          behavior: SnackBarBehavior.floating,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          margin: const EdgeInsets.all(12),
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      debugPrint('❌ Error showing notification snackbar: $e');
    }
  }

  Widget _buildSearchField(bool isMobile) {
    return GestureDetector(
      onTap: () {
        Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => const SearchScreen(),
        ));
      },
      child: AbsorbPointer( // Absorb touches to trigger onTap above
        child: TextField(
          controller: _searchController,
          focusNode: _searchFocus,
          decoration: InputDecoration(
            hintText: 'Tìm bất cứ điều gì',
            hintStyle: TextStyle(color: Colors.white.withAlpha((isMobile ? 0.7 : 0.65) * 255 ~/ 1), fontSize: 13.sp(context)),
            prefixIcon: Icon(Icons.search, color: Colors.white.withAlpha((0.65 * 255).round()), size: 16.sp(context)),
            filled: true,
            fillColor: Colors.white.withAlpha((isMobile ? 0.2 : 0.18) * 255 ~/ 1),
            contentPadding: isMobile ? EdgeInsets.symmetric(horizontal: 16.sp(context), vertical: 8.sp(context)) : const EdgeInsets.symmetric(vertical: 0),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(25), borderSide: BorderSide.none),
          ),
          style: TextStyle(color: Colors.white, fontSize: 13.sp(context)),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth > 800;

    return Scaffold(
      drawer: isDesktop ? null : Drawer(
        child: Container(
          color: Theme.of(context).cardColor,
          child: _buildSidebarContent(isDrawer: true),
        ),
      ),
      appBar: PreferredSize(
        preferredSize: Size.fromHeight(isDesktop ? 72 : 64),
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [Color(0xFF8F1820), Color(0xFFC91F28), Color(0xFF123B74)],
              stops: [0.0, 0.42, 1.0],
            ),
            boxShadow: [
              BoxShadow(
                color: Color(0x380F172A),
                blurRadius: 50,
                offset: Offset(0, 20),
              )
            ]
          ),
          child: AppBar(
            backgroundColor: Colors.transparent,
            elevation: 0,
            titleSpacing: 0,
            iconTheme: const IconThemeData(color: Colors.white),
            leading: isDesktop
                ? IconButton(icon: const Icon(Icons.menu, size: 24, color: Colors.white), onPressed: () {})
                : Builder(
                    builder: (context) => IconButton(
                      icon: const Icon(Icons.menu, size: 24, color: Colors.white),
                      onPressed: () => Scaffold.of(context).openDrawer(),
                    ),
                  ),
            title: screenWidth <= 600
                ? // Mobile: App logo + full-width Reddit-style search bar
                  Row(
                    children: [
                      Expanded(
                        child: GestureDetector(
                          onTap: () {
                            Navigator.of(context).push(MaterialPageRoute(
                              builder: (_) => const SearchScreen(),
                            ));
                          },
                          child: Container(
                            height: 36.sp(context),
                            decoration: BoxDecoration(
                              color: Colors.white.withAlpha((0.15 * 255).round()),
                              borderRadius: BorderRadius.circular(25),
                              border: Border.all(color: Colors.white.withAlpha((0.2 * 255).round())),
                            ),
                            child: Row(
                              children: [
                                const SizedBox(width: 12),
                                Container(
                                  width: 20.sp(context), height: 20.sp(context),
                                  decoration: BoxDecoration(color: Colors.white.withAlpha(240), borderRadius: BorderRadius.circular(8)),
                                  child: Center(child: Text('L', style: TextStyle(fontSize: 12.sp(context), fontWeight: FontWeight.bold, color: const Color(0xFFC91F28)))),
                                ),
                                const SizedBox(width: 8),
                                Text('Tìm kiếm bài viết...', style: TextStyle(color: Colors.white.withAlpha((0.7 * 255).round()), fontSize: 12.sp(context), fontWeight: FontWeight.w500)),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  )
                : // Desktop/tablet: logo + name on left
                  InkWell(
                    onTap: () => setState(() => _currentIndex = 0),
                    child: Row(
                      children: [
                        Container(
                          width: 44, height: 44,
                          decoration: BoxDecoration(color: Colors.white.withAlpha(240), borderRadius: BorderRadius.circular(16), boxShadow: [BoxShadow(color: Colors.black.withAlpha(20), blurRadius: 10)]),
                          child: const Center(child: Text('L', style: TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFFC91F28)))),
                        ),
                        const SizedBox(width: 12),
                        const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Text('Linky', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: Colors.white, letterSpacing: -0.5, height: 1.1)),
                            Text('SOCIAL HUB', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 9, color: Colors.white70, letterSpacing: 2, height: 1.1)),
                          ],
                        ),
                      ],
                    ),
                  ),
          actions: [
            if (screenWidth > 600) ...[  
              Container(
                width: isDesktop ? 380 : 230,
                margin: const EdgeInsets.symmetric(vertical: 10),
                child: _buildSearchField(false),
              ),
              const SizedBox(width: 8),
            ],

            if (isDesktop) ...[
              PopupMenuButton<int>(
                offset: const Offset(0, 50),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                color: Theme.of(context).cardColor,
                child: Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 8.0),
                  child: Container(
                    decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: Colors.white.withAlpha(50), width: 2),
                    ),
                    child: CircleAvatar(
                      radius: 18,
                      backgroundColor: Colors.transparent,
                      backgroundImage: NetworkImage(AuthService.currentUser?.fullProfilePicture ?? 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200'),
                    ),
                  ),
                ),
                onSelected: (value) {
                  if (value == 0) setState(() => _currentIndex = 4);
                  if (value == 1) setState(() => _currentIndex = 5);
                  if (value == 2) {
                    Navigator.of(context).pushReplacement(
                      MaterialPageRoute(builder: (context) => const LoginScreen()),
                    );
                  }
                },
                itemBuilder: (context) => [
                  PopupMenuItem(
                    value: -1, 
                    enabled: false, 
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start, 
                      children: [
                        Text(
                          AuthService.currentUser?.displayName ?? AuthService.currentUser?.username ?? 'Tác giả', 
                          style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: Theme.of(context).colorScheme.onSurface)
                        ),
                      ]
                    )
                  ),
                  const PopupMenuDivider(),
                  PopupMenuItem(value: 0, child: Row(children: [Icon(Icons.person_outline, size: 18, color: Theme.of(context).colorScheme.onSurface), const SizedBox(width: 8), const Text('Xem hồ sơ')])),
                  PopupMenuItem(value: 1, child: Row(children: [Icon(Icons.settings_outlined, size: 18, color: Theme.of(context).colorScheme.onSurface), const SizedBox(width: 8), const Text('Cài đặt')])),
                  const PopupMenuDivider(),
                  const PopupMenuItem(value: 2, child: Row(children: [Icon(Icons.logout, size: 18, color: Color(0xFFC91F28)), SizedBox(width: 8), Text('Đăng xuất', style: TextStyle(color: Color(0xFFC91F28)))])),
                ],
              ),
            ] else ...[
            ],
            const SizedBox(width: 8),
          ],
        ),
        ),
      ),
      bottomNavigationBar: isDesktop ? null : BottomNavigationBar(
        currentIndex: () {
          if (_currentIndex <= 4) return _currentIndex;
          return 0;
        }(),
        onTap: (idx) {
          setState(() {
            _currentIndex = idx;
            if (idx == 4) _viewingProfileId = null;
            if (idx == 3) {
              NotificationService.markAllAsRead();
              NotificationService.notifyReadNotifications();
            }
          });
        },
        type: BottomNavigationBarType.fixed,
        backgroundColor: Theme.of(context).cardColor,
        selectedItemColor: const Color(0xFFD32F2F),
        unselectedItemColor: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()),
        selectedFontSize: 10.sp(context),
        unselectedFontSize: 10.sp(context),
        elevation: 8,
        items: [
          const BottomNavigationBarItem(icon: Icon(Icons.home_outlined), activeIcon: Icon(Icons.home), label: 'Trang chủ'),
          BottomNavigationBarItem(
            icon: ValueListenableBuilder<int>(
              valueListenable: MessageService.unreadTotalCount,
              builder: (context, count, _) {
                return Badge(
                  label: count > 0 ? Text(count > 99 ? '99+' : '$count', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10, height: 1.1)) : null,
                  isLabelVisible: count > 0,
                  backgroundColor: const Color(0xFFD32F2F),
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  child: const Icon(Icons.mode_comment_outlined),
                );
              }
            ),
            activeIcon: ValueListenableBuilder<int>(
              valueListenable: MessageService.unreadTotalCount,
              builder: (context, count, _) {
                return Badge(
                   label: count > 0 ? Text(count > 99 ? '99+' : '$count', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10, height: 1.1)) : null,
                  isLabelVisible: count > 0,
                  backgroundColor: const Color(0xFFD32F2F),
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  child: const Icon(Icons.mode_comment),
                );
              }
            ),
            label: 'Tin nhắn'
          ),
          const BottomNavigationBarItem(icon: Icon(Icons.add_circle_outline, size: 30), activeIcon: Icon(Icons.add_circle, size: 30, color: Color(0xFFD32F2F)), label: 'Tạo'),
          BottomNavigationBarItem(
            icon: ValueListenableBuilder<int>(
              valueListenable: NotificationService.unreadCount,
              builder: (context, count, _) {
                return Badge(
                   label: count > 0 ? Text(count > 99 ? '99+' : '$count', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10, height: 1.1)) : null,
                  isLabelVisible: count > 0,
                  backgroundColor: const Color(0xFFD32F2F),
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  child: const Icon(Icons.notifications_none),
                );
              }
            ),
            activeIcon: ValueListenableBuilder<int>(
              valueListenable: NotificationService.unreadCount,
              builder: (context, count, _) {
                return Badge(
                   label: count > 0 ? Text(count > 99 ? '99+' : '$count', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10, height: 1.1)) : null,
                  isLabelVisible: count > 0,
                  backgroundColor: const Color(0xFFD32F2F),
                  padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1),
                  child: const Icon(Icons.notifications),
                );
              }
            ),
            label: 'Thông báo',
          ),
          BottomNavigationBarItem(
            icon: CircleAvatar(
              radius: 13,
              backgroundImage: NetworkImage(AuthService.currentUser?.fullProfilePicture ?? 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200'),
            ),
            activeIcon: Container(
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: const Color(0xFFD32F2F), width: 2),
              ),
              child: CircleAvatar(
                radius: 13,
                backgroundImage: NetworkImage(AuthService.currentUser?.fullProfilePicture ?? 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200'),
              ),
            ),
            label: 'Bạn',
          ),
        ],
      ),
      body: Stack(
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (isDesktop)
                Container(
                  width: 240,
                  decoration: BoxDecoration(
                    color: Theme.of(context).cardColor,
                    border: Border(right: BorderSide(color: Theme.of(context).dividerColor)),
                  ),
                  child: _buildSidebarContent(isDrawer: false),
                ),
              Expanded(
                child: Container(
                  color: Theme.of(context).scaffoldBackgroundColor,
                  child: _screens[_currentIndex],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSidebarContent({required bool isDrawer}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (isDrawer)
          const Padding(
            padding: EdgeInsets.only(left: 20.0, top: 40.0, bottom: 20.0),
            child: Row(
              children: [
                Text('🔗', style: TextStyle(fontSize: 24)),
                SizedBox(width: 8),
                Text('Linky', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFFD32F2F))),
              ],
            ),
          )
        else
          const SizedBox(height: 16),
          
        _buildSidebarItem(
          icon: Icons.new_releases_outlined, title: 'Mới nhất',
          isSelected: _currentIndex == 0 && _sidebarFilter == 0,
          onTap: () {
            setState(() { _currentIndex = 0; _sidebarFilter = 0; });
            if (isDrawer) Navigator.pop(context);
          },
        ),
        _buildSidebarItem(
          icon: Icons.local_fire_department_outlined, title: 'Phổ biến',
          isSelected: _currentIndex == 0 && _sidebarFilter == 1,
          onTap: () {
            setState(() { _currentIndex = 0; _sidebarFilter = 1; });
            if (isDrawer) Navigator.pop(context);
          },
        ),
        _buildSidebarItem(
          icon: Icons.trending_up_outlined, title: 'Top',
          isSelected: _currentIndex == 0 && _sidebarFilter == 2,
          onTap: () {
            setState(() { _currentIndex = 0; _sidebarFilter = 2; });
            if (isDrawer) Navigator.pop(context);
          },
        ),
        _buildSidebarItem(
          icon: Icons.bookmark_outline, title: 'Đã lưu',
          isSelected: _currentIndex == 9,
          onTap: () {
            setState(() { _currentIndex = 9; });
            if (isDrawer) Navigator.pop(context);
          },
        ),
        _buildSidebarItem(
          icon: Icons.explore_outlined, title: 'Khám phá',
          isSelected: _currentIndex == 8,
          onTap: () {
            setState(() { _currentIndex = 8; });
            if (isDrawer) Navigator.pop(context);
          },
        ),
        
        const Spacer(),
        Divider(color: Theme.of(context).dividerColor, height: 1),
        const SizedBox(height: 16),
        _buildBottomSidebarItem(icon: Icons.menu_book_outlined, title: 'Nội quy', index: 6, isDrawer: isDrawer),
        _buildBottomSidebarItem(icon: Icons.chat_bubble_outline, title: 'Đóng góp ý kiến', index: 7, isDrawer: isDrawer),
        const SizedBox(height: 24),
      ],
    );
  }

  Widget _buildSidebarItem({required IconData icon, required String title, required bool isSelected, required VoidCallback onTap}) {
    return InkWell(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFC91F28) : Colors.transparent, 
          borderRadius: BorderRadius.circular(16),
          boxShadow: isSelected ? [BoxShadow(color: const Color(0xFFC91F28).withAlpha((0.2 * 255).round()), blurRadius: 10, offset: const Offset(0, 4))] : [],
        ),
        child: Row(
          children: [
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: isSelected ? Colors.white.withAlpha((0.15 * 255).round()) : Theme.of(context).brightness == Brightness.light ? Colors.grey.shade100 : const Color(0xFF1E293B),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Icon(icon, size: 20, color: isSelected ? Colors.white : Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round())),
            ),
            const SizedBox(width: 12),
            Text(
              title,
              style: TextStyle(
                fontSize: 14.sp(context),
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                color: isSelected ? Colors.white : Theme.of(context).colorScheme.onSurface.withAlpha((0.8 * 255).round()),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBottomSidebarItem({required IconData icon, required String title, required int index, required bool isDrawer}) {
    final isSelected = _currentIndex == index;
    return InkWell(
      onTap: () {
        setState(() => _currentIndex = index);
        if (isDrawer) Navigator.pop(context);
      },
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 10),
        child: Row(
          children: [
            Icon(icon, size: 18, color: isSelected ? const Color(0xFFD32F2F) : Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round())),
            const SizedBox(width: 16),
            Text(title, style: TextStyle(fontSize: 14, color: isSelected ? const Color(0xFFD32F2F) : Theme.of(context).colorScheme.onSurface.withAlpha((0.8 * 255).round()), fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
          ],
        ),
      ),
    );
  }
}
