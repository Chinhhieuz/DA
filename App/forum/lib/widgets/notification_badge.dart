import 'package:flutter/material.dart';
import '../services/notification_service.dart';

class NotificationBadge extends StatelessWidget {
  final VoidCallback onTap;
  final Color? color;

  const NotificationBadge({
    super.key,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: NotificationService.unreadCount,
      builder: (context, count, _) {
        return IconButton(
          icon: Badge(
            label: count > 0 ? Text('$count', style: const TextStyle(fontSize: 10, color: Colors.white)) : null,
            isLabelVisible: count > 0,
            backgroundColor: const Color(0xFFD32F2F),
            child: Icon(
              count > 0 ? Icons.notifications : Icons.notifications_none,
              color: color ?? (Theme.of(context).brightness == Brightness.light ? Colors.white : Colors.white70),
              size: 22,
            ),
          ),
          onPressed: onTap,
        );
      },
    );
  }
}
