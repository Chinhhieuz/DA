import 'package:flutter/material.dart';
import '../../services/auth_service.dart';
import '../../app_theme.dart';
import '../../widgets/notification_badge.dart';
import '../home/main_layout.dart';
import '../auth/login_screen.dart';
class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _pushNotifications = AuthService.currentUser?.preferences['pushNotifications'] ?? true;
  bool _commentNotifications = AuthService.currentUser?.preferences['commentNotifications'] ?? true;

  final TextEditingController _currentPasswordController =
      TextEditingController();
  final TextEditingController _newPasswordController = TextEditingController();
  final TextEditingController _confirmPasswordController =
      TextEditingController();

  void _handleChangePassword() async {
    final oldPassword = _currentPasswordController.text;
    final newPassword = _newPasswordController.text;
    final confirmPassword = _confirmPasswordController.text;

    if (oldPassword.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập đầy đủ các trường')),
      );
      return;
    }

    if (newPassword != confirmPassword) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Mật khẩu mới không khớp')),
      );
      return;
    }

    final result = await AuthService.changePassword(oldPassword, newPassword);
    if (mounted) {
      if (result['success']) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Đổi mật khẩu thành công!')),
        );
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['message'])),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth > 800;
    final isDark = Theme.of(context).brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text(
          'Cài đặt',
          style: TextStyle(
            color: Theme.of(context).colorScheme.onSurface,
            fontWeight: FontWeight.bold,
            fontSize: 18,
          ),
        ),
        backgroundColor: Theme.of(context).appBarTheme.backgroundColor ?? Colors.white,
        elevation: 1,
        actions: [
          NotificationBadge(
            onTap: () {
              Navigator.of(context).pushAndRemoveUntil(
                MaterialPageRoute(builder: (_) => const MainLayout(initialIndex: 3)),
                (route) => false,
              );
            },
            color: Theme.of(context).colorScheme.onSurface,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 800),
          child: ListView(
            padding: const EdgeInsets.only(bottom: 40),
            children: [
              // ---------------- HERO SECTION ----------------
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: isDark ? const Color(0xFF1E293B) : Colors.grey.shade50,
                  border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: const Color(0xFFD32F2F).withAlpha((0.1 * 255).round()),
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: const Text('CONTROL PANEL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Color(0xFFD32F2F), letterSpacing: 1.5)),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Kiểm soát thông báo, bảo mật và chế độ hiển thị từ một nơi.',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Theme.of(context).colorScheme.onSurface,
                        letterSpacing: -0.5,
                        height: 1.2,
                      ),
                    ),
                    const SizedBox(height: 12),
                    Text(
                      'Sắp xếp lại các tùy chọn quan trọng theo từng nhóm để dễ quét, dễ đổi và dễ quay lại sau này.',
                      style: TextStyle(
                        fontSize: 14,
                        color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),
                    // Stats grid
                    Row(
                      children: [
                        Expanded(child: _buildHeroStat('Push', _pushNotifications ? 'On' : 'Off', 'Thông báo đẩy')),
                        const SizedBox(width: 12),
                        Expanded(child: _buildHeroStat('Comment', _commentNotifications ? 'On' : 'Off', 'Cảnh báo bình luận')),
                        const SizedBox(width: 12),
                        Expanded(child: _buildHeroStat('Theme', themeNotifier.value == ThemeMode.dark ? 'Dark' : 'Light', 'Chế độ hiện tại')),
                      ],
                    ),
                  ],
                ),
              ),

              Padding(
                padding: EdgeInsets.all(isDesktop ? 24.0 : 16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // ---------------- THÔNG BÁO ----------------
                    _buildSettingsCard(
                      icon: Icons.notifications_active,
                      iconColor: Colors.amber.shade700,
                      iconBg: Colors.amber.withAlpha((0.15 * 255).round()),
                      title: 'Thông báo',
                      subtitle: 'Quản lý thông báo và cảnh báo cho từng loại tương tác.',
                      child: Column(
                        children: [
                          _buildModernSwitchItem(
                            title: 'Thông báo đẩy',
                            subtitle: 'Nhận thông báo về các hoạt động mới trên hệ thống.',
                            value: _pushNotifications,
                            onChanged: (val) async {
                              setState(() => _pushNotifications = val);
                              await AuthService.updateSettings({
                                'pushNotifications': val,
                                'commentNotifications': _commentNotifications,
                                'darkMode': themeNotifier.value == ThemeMode.dark,
                              });
                            },
                          ),
                          Padding(
                            padding: const EdgeInsets.symmetric(vertical: 8),
                            child: Divider(color: Theme.of(context).dividerColor),
                          ),
                          _buildModernSwitchItem(
                            title: 'Thông báo bình luận',
                            subtitle: 'Được thông báo khi có người bình luận vào bài viết của bạn.',
                            value: _commentNotifications,
                            onChanged: (val) async {
                              setState(() => _commentNotifications = val);
                              await AuthService.updateSettings({
                                'pushNotifications': _pushNotifications,
                                'commentNotifications': val,
                                'darkMode': themeNotifier.value == ThemeMode.dark,
                              });
                            },
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ---------------- BẢO MẬT ----------------
                    _buildSettingsCard(
                      icon: Icons.lock_outline,
                      iconColor: Colors.blue.shade600,
                      iconBg: Colors.blue.withAlpha((0.15 * 255).round()),
                      title: 'Bảo mật',
                      subtitle: 'Cập nhật mật khẩu và giữ tài khoản an toàn.',
                      child: Theme(
                        data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
                        child: ExpansionTile(
                          tilePadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          leading: null,
                          collapsedBackgroundColor: isDark ? const Color(0xFF1E293B) : Colors.grey.shade50,
                          backgroundColor: isDark ? const Color(0xFF1E293B) : Colors.grey.shade50,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          collapsedShape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          title: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.shield_outlined, size: 16, color: Color(0xFFD32F2F)),
                                      const SizedBox(width: 8),
                                      Text(
                                        'Làm mới thông tin đăng nhập',
                                        style: TextStyle(fontWeight: FontWeight.w700, fontSize: 13, color: Theme.of(context).colorScheme.onSurface),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 4),
                                  Text(
                                    'Nên đổi mật khẩu định kỳ để an toàn.',
                                    style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round())),
                                  ),
                                ],
                              ),
                            ],
                          ),
                          iconColor: const Color(0xFFD32F2F),
                          collapsedIconColor: Colors.grey,
                          childrenPadding: const EdgeInsets.all(16),
                          children: [
                            _buildPasswordField('Mật khẩu hiện tại', _currentPasswordController),
                            const SizedBox(height: 16),
                            _buildPasswordField('Mật khẩu mới', _newPasswordController),
                            const SizedBox(height: 16),
                            _buildPasswordField('Xác nhận mật khẩu mới', _confirmPasswordController),
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: _handleChangePassword,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFFD32F2F),
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  elevation: 0,
                                ),
                                child: const Text('Cập nhật mật khẩu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15)),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),

                    // ---------------- GIAO DIỆN ----------------
                    _buildSettingsCard(
                      icon: Icons.palette_outlined,
                      iconColor: const Color(0xFFD32F2F),
                      iconBg: const Color(0xFFD32F2F).withAlpha((0.15 * 255).round()),
                      title: 'Giao diện',
                      subtitle: 'Tùy chỉnh chế độ hiển thị cho trải nghiệm phù hợp hơn.',
                      child: _buildModernSwitchItem(
                        title: 'Chế độ tối',
                        subtitle: 'Sử dụng giao diện tối cho không gian hiển thị đậm hơn.',
                        value: themeNotifier.value == ThemeMode.dark,
                        onChanged: (val) async {
                          themeNotifier.value = val ? ThemeMode.dark : ThemeMode.light;
                          await AuthService.updateSettings({
                            'pushNotifications': _pushNotifications,
                            'commentNotifications': _commentNotifications,
                            'darkMode': val,
                          });
                        },
                      ),
                    ),

                    const SizedBox(height: 24),

                    // ---------------- ĐĂNG XUẤT ----------------
                    Container(
                      decoration: BoxDecoration(
                        color: Colors.red.withAlpha((0.05 * 255).round()),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(color: Colors.red.withAlpha((0.2 * 255).round())),
                      ),
                      padding: const EdgeInsets.all(20),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Đăng xuất', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                const SizedBox(height: 4),
                                Text(
                                  'Thoát khỏi phiên hiện tại và xóa thông tin đăng nhập.',
                                  style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round())),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          ElevatedButton(
                            onPressed: () {
                              AuthService.logout();
                              Navigator.of(context).pushAndRemoveUntil(
                                MaterialPageRoute(builder: (_) => const LoginScreen()),
                                (route) => false,
                              );
                            },
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                            ),
                            child: const Text('Đăng xuất', style: TextStyle(fontWeight: FontWeight.bold)),
                          )
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHeroStat(String title, String value, String desc) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF161E2E) : Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Theme.of(context).dividerColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title.toUpperCase(), style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()), letterSpacing: 1.5)),
          const SizedBox(height: 8),
          Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Theme.of(context).colorScheme.onSurface)),
          const SizedBox(height: 4),
          Text(desc, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()))),
        ],
      ),
    );
  }

  Widget _buildSettingsCard({
    required IconData icon,
    required Color iconColor,
    required Color iconBg,
    required String title,
    required String subtitle,
    required Widget child,
  }) {
    return Container(
      decoration: BoxDecoration(
        color: Theme.of(context).cardColor,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withAlpha((0.03 * 255).round()),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.5)),
      ),
      padding: const EdgeInsets.all(20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: iconBg,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Icon(icon, color: iconColor, size: 20),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    const SizedBox(height: 2),
                    Text(subtitle, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()))),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 20),
          child,
        ],
      ),
    );
  }

  Widget _buildModernSwitchItem({
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: isDark ? const Color(0xFF1E293B) : Colors.grey.shade50,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
                const SizedBox(height: 4),
                Text(subtitle, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()), height: 1.3)),
              ],
            ),
          ),
          const SizedBox(width: 16),
          Switch(
            value: value,
            onChanged: onChanged,
            activeThumbColor: Colors.white,
            activeTrackColor: const Color(0xFFD32F2F),
          ),
        ],
      ),
    );
  }



  Widget _buildPasswordField(String label, TextEditingController controller) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.w500,
            fontSize: 14,
            color: Theme.of(context).colorScheme.onSurface,
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: true,
          decoration: InputDecoration(
            hintText: 'Nhập $label'.toLowerCase(),
            filled: true,
            fillColor: Theme.of(context).brightness == Brightness.light ? Colors.grey.shade50 : const Color(0xFF1E293B),
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 16,
              vertical: 14,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide.none,
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFD32F2F)),
            ),
          ),
        ),
      ],
    );
  }
}
