import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../services/auth_service.dart';
import '../services/post_service.dart';

class EditProfileController {
  final BuildContext context;
  
  late final TextEditingController displayNameController;
  late final TextEditingController bioController;
  late final TextEditingController locationController;
  late final TextEditingController websiteController;

  EditProfileController(this.context) {
    displayNameController = TextEditingController(text: AuthService.currentUser?.displayName ?? AuthService.currentUser?.username);
    bioController = TextEditingController(text: AuthService.currentUser?.bio ?? '');
    locationController = TextEditingController(text: AuthService.currentUser?.location ?? '');
    websiteController = TextEditingController(text: AuthService.currentUser?.website ?? '');
  }

  void dispose() {
    displayNameController.dispose();
    bioController.dispose();
    locationController.dispose();
    websiteController.dispose();
  }

  Future<void> pickAndUploadAvatar({
    required Function(bool) setLoading,
    required VoidCallback onSuccess,
  }) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);
    
    if (pickedFile == null) return;

    setLoading(true);
    
    try {
      final uploadResult = await PostService.uploadImage(pickedFile);
      
      if (uploadResult['success']) {
        final avatarUrl = uploadResult['url'];
        final updateResult = await AuthService.updateProfile(avatarUrl: avatarUrl);
        
        if (updateResult['success']) {
          _showSnackBar('Cập nhật ảnh đại diện thành công!');
          onSuccess();
        } else {
          _showSnackBar(updateResult['message']);
        }
      } else {
        _showSnackBar(uploadResult['message']);
      }
    } catch (e) {
      _showSnackBar('Lỗi: $e');
    } finally {
      setLoading(false);
    }
  }

  Future<void> handleSave({
    required Function(bool) setLoading,
    required VoidCallback onSuccess,
  }) async {
    setLoading(true);
    
    final result = await AuthService.updateProfile(
      displayName: displayNameController.text.trim(),
      bio: bioController.text.trim(),
      location: locationController.text.trim(),
      website: websiteController.text.trim(),
    );

    setLoading(false);
    
    if (result['success']) {
      _showSnackBar('Cập nhật thành công!');
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
