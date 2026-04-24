import 'package:flutter/material.dart';
import '../services/auth_service.dart';

class SettingsController {
  final BuildContext context;
  
  final TextEditingController currentPasswordController = TextEditingController();
  final TextEditingController newPasswordController = TextEditingController();
  final TextEditingController confirmPasswordController = TextEditingController();

  SettingsController(this.context);

  void dispose() {
    currentPasswordController.dispose();
    newPasswordController.dispose();
    confirmPasswordController.dispose();
  }

  Future<void> handleChangePassword({required VoidCallback onSuccess}) async {
    final oldPassword = currentPasswordController.text;
    final newPassword = newPasswordController.text;
    final confirmPassword = confirmPasswordController.text;

    if (oldPassword.isEmpty || newPassword.isEmpty || confirmPassword.isEmpty) {
      _showSnackBar('Vui lòng nhập đầy đủ các trường');
      return;
    }

    if (newPassword != confirmPassword) {
      _showSnackBar('Mật khẩu mới không khớp');
      return;
    }

    final result = await AuthService.changePassword(oldPassword, newPassword);
    
    if (result['success']) {
      _showSnackBar('Đổi mật khẩu thành công!');
      currentPasswordController.clear();
      newPasswordController.clear();
      confirmPasswordController.clear();
      onSuccess();
    } else {
      _showSnackBar(result['message']);
    }
  }

  void _showSnackBar(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }
}
