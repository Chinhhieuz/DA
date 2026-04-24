import 'dart:io' as io;
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:image_cropper/image_cropper.dart';
import '../../services/auth_service.dart';
import '../../services/post_service.dart';

class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({super.key});

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  final _displayNameController = TextEditingController(text: AuthService.currentUser?.displayName ?? AuthService.currentUser?.username);
  final _bioController = TextEditingController(text: AuthService.currentUser?.bio ?? '');
  final _locationController = TextEditingController(text: AuthService.currentUser?.location ?? '');
  final _websiteController = TextEditingController(text: AuthService.currentUser?.website ?? '');
  final _mssvController = TextEditingController(text: AuthService.currentUser?.mssv ?? '');
  final _facultyController = TextEditingController(text: AuthService.currentUser?.faculty ?? '');
  bool _isLoading = false;
  bool _isUploadingAvatar = false;
  String? _localPickedImagePath;

  Future<void> _pickAndUploadAvatar() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
    
    if (pickedFile == null) return;

    setState(() {
      _isUploadingAvatar = true;
    });

    String? finalPath = pickedFile.path;
    List<int> bytes;
    String fileName = pickedFile.name;

    if (!kIsWeb) {
      try {
        CroppedFile? croppedFile = await ImageCropper().cropImage(
          sourcePath: pickedFile.path,
          aspectRatio: const CropAspectRatio(ratioX: 1, ratioY: 1),
          uiSettings: [
            AndroidUiSettings(
                toolbarTitle: 'Căn chỉnh ảnh',
                toolbarColor: const Color(0xFFD32F2F),
                toolbarWidgetColor: Colors.white,
                initAspectRatio: CropAspectRatioPreset.square,
                lockAspectRatio: true),
            IOSUiSettings(
              title: 'Căn chỉnh ảnh',
              aspectRatioLockEnabled: true,
              resetAspectRatioEnabled: false,
            ),
          ],
        );
        if (croppedFile != null) {
          finalPath = croppedFile.path;
          bytes = await croppedFile.readAsBytes();
        } else {
          // Cropping cancelled
          setState(() => _isUploadingAvatar = false);
          return;
        }
      } catch (e) {
        debugPrint('Lỗi crop ảnh: $e');
        bytes = await pickedFile.readAsBytes();
      }
    } else {
      bytes = await pickedFile.readAsBytes();
    }

    setState(() {
      _localPickedImagePath = finalPath;
    });
    
    try {
      final uploadResult = await PostService.uploadImage(
        XFile.fromData(Uint8List.fromList(bytes), name: fileName)
      );
      
      if (uploadResult['success']) {
        final avatarUrl = uploadResult['url'];
        final updateResult = await AuthService.updateProfile(avatarUrl: avatarUrl);
        
        if (updateResult['success']) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Cập nhật ảnh đại diện thành công!')),
          );
        } else {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(updateResult['message'])),
          );
        }
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(uploadResult['message'])),
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Lỗi: $e')),
      );
    } finally {
      if (mounted) {
        setState(() {
          _isUploadingAvatar = false;
          _localPickedImagePath = null;
        });
      }
    }
  }

  void _handleSave() async {
    setState(() => _isLoading = true);
    
    final result = await AuthService.updateProfile(
      displayName: _displayNameController.text.trim(),
      bio: _bioController.text.trim(),
      location: _locationController.text.trim(),
      website: _websiteController.text.trim(),
      mssv: _mssvController.text.trim(),
      faculty: _facultyController.text.trim(),
    );

    if (mounted) {
      setState(() => _isLoading = false);
      if (result['success']) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Cập nhật thành công!')),
        );
        Navigator.of(context).pop();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(result['message'])),
        );
      }
    }
  }

  @override
  void dispose() {
    _displayNameController.dispose();
    _bioController.dispose();
    _locationController.dispose();
    _websiteController.dispose();
    _mssvController.dispose();
    _facultyController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      body: SingleChildScrollView(
        child: Column(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  height: 180,
                  width: double.infinity,
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      colors: [Color(0xFFD32F2F), Color(0xFFFF8A65)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                  ),
                  child: SafeArea(
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisAlignment: MainAxisAlignment.end,
                        children: [
                          IconButton(
                            onPressed: () => Navigator.of(context).pop(),
                            icon: const Icon(Icons.close, color: Colors.white),
                            style: IconButton.styleFrom(backgroundColor: Colors.black12),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: -50,
                  left: 24,
                  child: Stack(
                    children: [
                      Container(
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          border: Border.all(color: Theme.of(context).cardColor, width: 4),
                          boxShadow: [
                            BoxShadow(color: Colors.black.withAlpha((0.1 * 255).round()), blurRadius: 10, offset: const Offset(0, 4)),
                          ],
                        ),
                        child: InkWell(
                          onTap: () {
                            if (!_isUploadingAvatar) _pickAndUploadAvatar();
                          },
                          borderRadius: BorderRadius.circular(54),
                          child: Stack(
                            alignment: Alignment.center,
                            children: [
                              CircleAvatar(
                                radius: 54,
                                backgroundColor: Theme.of(context).scaffoldBackgroundColor,
                                backgroundImage: _localPickedImagePath != null 
                                    ? FileImage(io.File(_localPickedImagePath!)) as ImageProvider
                                    : (AuthService.currentUser?.fullProfilePicture != null
                                        ? NetworkImage(AuthService.currentUser!.fullProfilePicture!)
                                        : null),
                                child: (_localPickedImagePath == null && AuthService.currentUser?.fullProfilePicture == null)
                                    ? Text(
                                        (AuthService.currentUser?.displayName?.isNotEmpty == true)
                                            ? AuthService.currentUser!.displayName![0].toUpperCase()
                                            : ((AuthService.currentUser?.username.isNotEmpty == true)
                                                ? AuthService.currentUser!.username[0].toUpperCase()
                                                : 'U'),
                                        style: TextStyle(
                                          fontSize: 32, 
                                          fontWeight: FontWeight.bold, 
                                          color: Theme.of(context).colorScheme.onSurface
                                        ),
                                      )
                                    : null,
                              ),
                              if (_isUploadingAvatar)
                                Container(
                                  width: 108,
                                  height: 108,
                                  decoration: BoxDecoration(
                                    color: Colors.black.withAlpha((0.3 * 255).round()),
                                    shape: BoxShape.circle,
                                  ),
                                  child: const Center(
                                    child: CircularProgressIndicator(
                                      color: Colors.white,
                                      strokeWidth: 3,
                                    ),
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ),
                      Positioned(
                        bottom: 4,
                        right: 4,
                        child: GestureDetector(
                          onTap: () {
                            if (!_isUploadingAvatar) _pickAndUploadAvatar();
                          },
                          child: Container(
                            padding: const EdgeInsets.all(6),
                            decoration: BoxDecoration(
                              color: const Color(0xFFD32F2F),
                              shape: BoxShape.circle,
                              border: Border.all(color: Theme.of(context).cardColor, width: 2),
                            ),
                            child: const Icon(Icons.camera_alt, color: Colors.white, size: 18),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
            ],
          ),

            const SizedBox(height: 70),

            Padding(
              padding: const EdgeInsets.all(24.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildSectionTitle(Icons.person_outline, 'Thông tin cơ bản'),
                  const SizedBox(height: 24),
                  _buildField(
                    label: 'TÊN HIỂN THỊ',
                    controller: _displayNameController,
                    hint: 'Tô Chính Hiệu',
                  ),
                  const SizedBox(height: 24),
                  _buildField(
                    label: 'GIỚI THIỆU BẢN THÂN (TIỂU SỬ)',
                    controller: _bioController,
                    hint: 'Kể về bản thân bạn...',
                    maxLines: 4,
                    textColor: Theme.of(context).colorScheme.onSurface,
                  ),

                  const SizedBox(height: 40),

                  _buildSectionTitle(Icons.language, 'Liên hệ & Mạng xã hội'),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: _buildField(
                          label: 'ĐỊA ĐIỂM SINH SỐNG',
                          controller: _locationController,
                          hint: 'Ví dụ: TP. Hồ Chí Minh',
                          prefixIcon: Icons.location_on_outlined,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildField(
                          label: 'TRANG WEB CÁ NHÂN',
                          controller: _websiteController,
                          hint: 'https://...',
                          prefixIcon: Icons.link,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 40),

                  _buildSectionTitle(Icons.school_outlined, 'Thông tin học tập'),
                  const SizedBox(height: 24),
                  Row(
                    children: [
                      Expanded(
                        child: _buildField(
                          label: 'MÃ SỐ SINH VIÊN (MSSV)',
                          controller: _mssvController,
                          hint: 'Ví dụ: 20110XXX',
                          prefixIcon: Icons.badge_outlined,
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildField(
                          label: 'CHUYÊN NGÀNH',
                          controller: _facultyController,
                          hint: 'Ví dụ: Công nghệ thông tin',
                          prefixIcon: Icons.book_outlined,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 40),
                  const SizedBox(height: 8),

                  const SizedBox(height: 48),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        style: TextButton.styleFrom(
                          foregroundColor: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        ),
                        child: const Text('Hủy bỏ', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                      const SizedBox(width: 16),
                      ElevatedButton.icon(
                        onPressed: _isLoading ? null : _handleSave,
                        icon: _isLoading 
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : const Icon(Icons.save_outlined, size: 18),
                        label: const Text('Lưu thay đổi'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD32F2F),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          elevation: 0,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSectionTitle(IconData icon, String title) {
    return Column(
      children: [
        Row(
          children: [
            Icon(icon, size: 20, color: const Color(0xFFD32F2F)),
            const SizedBox(width: 8),
            Text(
              title,
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Theme.of(context).colorScheme.onSurface),
            ),
          ],
        ),
        const SizedBox(height: 8),
        Divider(color: Theme.of(context).dividerColor, thickness: 1.5),
      ],
    );
  }

  Widget _buildField({
    required String label,
    required TextEditingController controller,
    required String hint,
    IconData? prefixIcon,
    int maxLines = 1,
    bool enabled = true,
    Color? textColor,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            letterSpacing: 0.5,
            color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          maxLines: maxLines,
          enabled: enabled,
          style: TextStyle(fontSize: 14, color: textColor ?? Theme.of(context).colorScheme.onSurface),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 14),
            prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 18, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.4 * 255).round())) : null,
            filled: true,
            fillColor: enabled ? (Theme.of(context).brightness == Brightness.light ? Colors.grey.shade50 : const Color(0xFF161E2E)) : (Theme.of(context).brightness == Brightness.light ? Colors.grey.shade100 : const Color(0xFF1E293B)),
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Theme.of(context).dividerColor),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: BorderSide(color: Theme.of(context).dividerColor),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(8),
              borderSide: const BorderSide(color: Color(0xFFD32F2F), width: 1.5),
            ),
          ),
        ),
      ],
    );
  }
}
