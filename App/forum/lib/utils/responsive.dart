import 'package:flutter/material.dart';
import 'dart:math' as math;

class Responsive extends StatelessWidget {
  final Widget mobile;
  final Widget? tablet;
  final Widget desktop;

  const Responsive({
    super.key,
    required this.mobile,
    this.tablet,
    required this.desktop,
  });

  static bool isMobile(BuildContext context) =>
      MediaQuery.of(context).size.width < 600;

  static bool isTablet(BuildContext context) =>
      MediaQuery.of(context).size.width < 1200 &&
      MediaQuery.of(context).size.width >= 600;

  static bool isDesktop(BuildContext context) =>
      MediaQuery.of(context).size.width >= 1200;

  @override
  Widget build(BuildContext context) {
    final Size size = MediaQuery.of(context).size;
    if (size.width >= 1200) {
      return desktop;
    } else if (size.width >= 600 && tablet != null) {
      return tablet!;
    } else {
      return mobile;
    }
  }
}

extension ResponsiveDouble on double {
  /// Scaled pixel based on screen width (using 375 as base mobile width)
  double sp(BuildContext context) {
    double width = MediaQuery.of(context).size.width;
    // Cap the scaling for desktop to avoid overly large text
    if (width > 1200) width = 1200;
    return this * (width / 375);
  }

  /// Percentage of screen width
  double w(BuildContext context) => this * MediaQuery.of(context).size.width / 100;

  /// Percentage of screen height
  double h(BuildContext context) => this * MediaQuery.of(context).size.height / 100;

  /// Responsive value based on screen type
  double p(BuildContext context, {double? tablet, double? desktop}) {
    if (Responsive.isDesktop(context)) return desktop ?? this;
    if (Responsive.isTablet(context)) return tablet ?? this;
    return this;
  }
}

extension ResponsiveInt on int {
  double sp(BuildContext context) => toDouble().sp(context);
  double w(BuildContext context) => toDouble().w(context);
  double h(BuildContext context) => toDouble().h(context);
}

/// A helper class to get responsive sizes without context (using global key or layout builder)
/// For simplicity, we'll mostly use the BuildContext extensions.
class ScreenSize {
  static double width(BuildContext context) => MediaQuery.of(context).size.width;
  static double height(BuildContext context) => MediaQuery.of(context).size.height;
  
  static double scale(BuildContext context, double size) {
    double baseWidth = 375;
    double scaleFactor = width(context) / baseWidth;
    return size * math.min(scaleFactor, 1.5); // Cap scale factor to 1.5x
  }
}
