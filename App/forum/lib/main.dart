import 'package:flutter/material.dart';
import 'package:timeago/timeago.dart' as timeago;
import 'app_theme.dart';
import 'screens/auth/login_screen.dart';
import 'screens/home/main_layout.dart';
import 'services/auth_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  timeago.setLocaleMessages('vi', timeago.ViMessages());
  final hasSession = await AuthService.init();
  runApp(LinkyApp(startWithSession: hasSession));
}

class LinkyApp extends StatelessWidget {
  final bool startWithSession;
  const LinkyApp({super.key, this.startWithSession = false});

  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<ThemeMode>(
      valueListenable: themeNotifier,
      builder: (_, mode, _) {
        return MaterialApp(
          title: 'Linky',
          debugShowCheckedModeBanner: false,
          themeMode: mode,
          theme: AppTheme.light,
          darkTheme: AppTheme.dark,
          home: startWithSession ? const MainLayout() : const LoginScreen(),
        );
      },
    );
  }
}
