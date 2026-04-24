import 'package:flutter/material.dart';

final ValueNotifier<ThemeMode> themeNotifier = ValueNotifier(ThemeMode.light);

class AppTheme {
  static ThemeData get light {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      primaryColor: const Color(0xFFD32F2F),
      scaffoldBackgroundColor: const Color(0xFFF8FAFC),
      cardColor: Colors.white,
      dividerColor: Colors.grey.shade200,
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFFD32F2F),
        foregroundColor: Colors.white,
        elevation: 4,
      ),
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xFFD32F2F),
        primary: const Color(0xFFD32F2F),
        surface: Colors.white,
        onSurface: Colors.black87,
      ),
    );
  }

  static ThemeData get dark {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: const Color(0xFFD32F2F),
      scaffoldBackgroundColor: const Color(0xFF020817),
      cardColor: const Color(0xFF0F172A),
      dividerColor: const Color(0xFF1E293B),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xFF020817),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      colorScheme: const ColorScheme.dark(
        primary: Color(0xFFD32F2F),
        surface: Color(0xFF020817),
        onSurface: Color(0xFFF8FAFC),
      ),
    );
  }
}
