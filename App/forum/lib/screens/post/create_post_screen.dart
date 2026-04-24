import 'dart:io' as io;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:file_picker/file_picker.dart';
import '../../services/post_service.dart';
import '../../services/auth_service.dart';
import '../../services/community_service.dart';
import '../../models/community.dart';
import '../../widgets/video_player_widget.dart';
import '../home/main_layout.dart';

class CreatePostScreen extends StatefulWidget {
  const CreatePostScreen({super.key});

  @override
  State<CreatePostScreen> createState() => _CreatePostScreenState();
}

class _CreatePostScreenState extends State<CreatePostScreen> {
  final _titleController = TextEditingController();
  final _contentController = TextEditingController();
  final _urlController = TextEditingController();
  String? _selectedCommunity;
  bool _isLoading = false;
  bool _isFetchingCommunities = true;
  final List<XFile> _imageFiles = [];
  XFile? _videoFile;
  final List<PlatformFile> _otherFiles = [];
  List<Community> _availableCommunities = [];

  @override
  void initState() {
    super.initState();
    _loadCommunities();
  }

  Future<void> _loadCommunities() async {
    setState(() => _isFetchingCommunities = true);
    try {
      final communities = await CommunityService.getCommunities();
      if (mounted) {
        setState(() {
          _availableCommunities = communities;
          if (communities.isNotEmpty) {
            _selectedCommunity = communities.first.name;
          }
          _isFetchingCommunities = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isFetchingCommunities = false);
      }
    }
  }

  Future<void> _pickImages() async {
    final ImagePicker picker = ImagePicker();
    final List<XFile> images = await picker.pickMultiImage();
    
    if (images.isNotEmpty) {
      if (mounted) {
        setState(() {
          _imageFiles.addAll(images);
        });
      }
    }
  }

  Future<void> _pickVideo() async {
    final ImagePicker picker = ImagePicker();
    final XFile? video = await picker.pickVideo(source: ImageSource.gallery);
    
    if (video != null) {
      if (mounted) {
        setState(() {
          _videoFile = video;
        });
      }
    }
  }

  Future<void> _pickFiles() async {
    try {
      final FilePickerResult? result = await FilePicker.pickFiles(
        allowMultiple: true,
        type: FileType.any,
      );

      if (result != null && result.files.isNotEmpty) {
        if (mounted) {
          setState(() {
            _otherFiles.addAll(result.files);
          });
        }
      }
    } catch (e) {
      debugPrint('Error picking files: $e');
    }
  }

  void _removeOtherFile(int index) {
    setState(() {
      _otherFiles.removeAt(index);
    });
  }

  void _removeVideo() {
    setState(() => _videoFile = null);
  }

  // Shows a bottom sheet to pick images or video (unified entry point)
  void _showMediaPicker() {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.transparent,
      builder: (ctx) => Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
        ),
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
        child: SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Container(
                width: 40, height: 4,
                decoration: BoxDecoration(
                  color: Theme.of(context).dividerColor,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
              const SizedBox(height: 20),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD32F2F).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.image_rounded, color: Color(0xFFD32F2F)),
                ),
                title: const Text('Chọn ảnh', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('JPG, PNG, WEBP (nhiều ảnh)'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickImages();
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD32F2F).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.videocam_rounded, color: Color(0xFFD32F2F)),
                ),
                title: const Text('Chọn video', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('MP4, MOV, MKV (tối đa 50MB)'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickVideo();
                },
              ),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: const Color(0xFFD32F2F).withValues(alpha: 0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.insert_drive_file_rounded, color: Color(0xFFD32F2F)),
                ),
                title: const Text('Chọn tệp khác', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('PDF, DOCX, ZIP...'),
                onTap: () {
                  Navigator.pop(ctx);
                  _pickFiles();
                },
              ),
              const SizedBox(height: 8),
            ],
          ),
        ),
      ),
    );
  }

  void _handlePost() async {
    final title = _titleController.text.trim();
    final content = _contentController.text.trim();
    
    if (title.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập tiêu đề')),
      );
      return;
    }

    if (_selectedCommunity == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn chủ đề')),
      );
      return;
    }

    if (content.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập nội dung bài viết')),
      );
      return;
    }

    setState(() => _isLoading = true);


    try {
      final result = await PostService.createPost(
        title: title,
        content: content,
        community: _selectedCommunity!,
        imageFiles: _imageFiles.isNotEmpty ? _imageFiles : null,
        videoFile: _videoFile,
        otherFiles: _otherFiles.isNotEmpty ? _otherFiles : null,
      );

      if (mounted) {
        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Đã đăng bài viết thành công!'),
              backgroundColor: Colors.green,
              behavior: SnackBarBehavior.floating,
            ),
          );
          _titleController.clear();
          _contentController.clear();
          _urlController.clear();
          setState(() {
            _imageFiles.clear();
            _videoFile = null;
            _otherFiles.clear();
          });
          // Redirect to home
          MainLayout.of(context)?.setIndex(0);
        } else {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(result['message'])),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _contentController.dispose();
    _urlController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isMobile = screenWidth <= 600;

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      padding: EdgeInsets.symmetric(
        vertical: isMobile ? 12 : 24, 
        horizontal: isMobile ? 10 : 20
      ),
      child: Center(
        child: Container(
          width: double.infinity,
          constraints: const BoxConstraints(maxWidth: 800),
          decoration: BoxDecoration(
            color: Theme.of(context).cardColor,
            borderRadius: BorderRadius.circular(isMobile ? 24 : 32),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withAlpha((0.08 * 255).round()),
                blurRadius: 40,
                offset: const Offset(0, 15),
              ),
            ],
          ),
          child: Padding(
            padding: EdgeInsets.all(isMobile ? 16 : 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Header - Matching Web CreatePost.tsx
                Row(
                  children: [
                    Stack(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(2),
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.red.withValues(alpha: 0.2), width: 2),
                          ),
                          child: CircleAvatar(
                            radius: 28,
                            backgroundColor: Theme.of(context).dividerColor,
                            backgroundImage: NetworkImage(
                              AuthService.currentUser?.profilePicture ?? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
                            ),
                          ),
                        ),
                        Positioned(
                          bottom: 2,
                          right: 2,
                          child: Container(
                            width: 14,
                            height: 14,
                            decoration: BoxDecoration(
                              color: Colors.green,
                              shape: BoxShape.circle,
                              border: Border.all(color: Theme.of(context).cardColor, width: 2),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.1),
                                  blurRadius: 4,
                                )
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Tạo bài viết mới',
                          style: TextStyle(
                            fontWeight: FontWeight.w900,
                            fontSize: 22,
                            letterSpacing: -0.6,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(height: 2),
                        RichText(
                          text: TextSpan(
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6),
                              fontSize: 13,
                              fontFamily: 'Inter',
                            ),
                            children: [
                              const TextSpan(text: 'Đang đăng với danh nghĩa '),
                              TextSpan(
                                text: '@${AuthService.currentUser?.username ?? "username"}',
                                style: const TextStyle(
                                  color: Color(0xFFD32F2F), 
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: 28),
                
                // Community Select - Dynamic from API
                _buildLabel('CHỌN CHỦ ĐỀ BÀI VIẾT'),
                const SizedBox(height: 8),
                _isFetchingCommunities 
                  ? const LinearProgressIndicator(color: Color(0xFFD32F2F), backgroundColor: Colors.transparent)
                  : DropdownButtonFormField<String>(
                      initialValue: _selectedCommunity,
                      icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.grey),
                      decoration: _inputDecoration(
                        hint: 'Chọn chủ đề để đăng bài...',
                      ),
                      dropdownColor: Theme.of(context).cardColor,
                      borderRadius: BorderRadius.circular(20),
                      items: _availableCommunities.map((c) => DropdownMenuItem(
                        value: c.name,
                        child: Row(
                          children: [
                            Text(c.icon, style: const TextStyle(fontSize: 18)),
                            const SizedBox(width: 10),
                            Text(c.name, style: TextStyle(
                              fontSize: 15, 
                              fontWeight: FontWeight.w600,
                              color: Theme.of(context).colorScheme.onSurface,
                            )),
                          ],
                        ),
                      )).toList(),
                      onChanged: (v) => setState(() => _selectedCommunity = v),
                    ),
                const SizedBox(height: 20),

                // Title
                _buildLabel('TIÊU ĐỀ'),
                const SizedBox(height: 8),
                TextField(
                  controller: _titleController,
                  style: TextStyle(
                    fontSize: 18, 
                    fontWeight: FontWeight.bold, 
                    color: Theme.of(context).colorScheme.onSurface,
                    letterSpacing: -0.4,
                  ),
                  decoration: _inputDecoration(
                    hint: 'Nhập tiêu đề ấn tượng...',
                  ),
                ),
                const SizedBox(height: 20),

                // Content
                _buildLabel('NỘI DUNG'),
                const SizedBox(height: 8),
                TextField(
                  controller: _contentController,
                  maxLines: 8,
                  minLines: 4,
                  style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurface,
                    height: 1.5,
                  ),
                  decoration: _inputDecoration(
                    hint: 'Bạn đang nghĩ gì? Chia sẻ kiến thức của bạn...',
                  ),
                ),
                const SizedBox(height: 20),

                // ── Unified Attachment Section (matches web frontend) ──
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildLabel('TỆP ĐÍNH KÈM (TÙY CHỌN)'),
                    if (_imageFiles.isNotEmpty || _videoFile != null)
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFD32F2F).withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFD32F2F).withValues(alpha: 0.2)),
                        ),
                        child: Row(
                          children: [
                            const Icon(Icons.upload_rounded, size: 12, color: Color(0xFFD32F2F)),
                            const SizedBox(width: 4),
                            Text(
                              "${[
                                if (_imageFiles.isNotEmpty) '${_imageFiles.length} ảnh',
                                if (_videoFile != null) '1 video',
                                if (_otherFiles.isNotEmpty) '${_otherFiles.length} tệp',
                              ].join(' · ')} · Sẽ tải lên khi đăng",
                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFD32F2F)),
                            ),
                          ],
                        ),
                      ),
                  ],
                ),
                const SizedBox(height: 10),

                // Big dashed placeholder — shown when no media selected
                if (_imageFiles.isEmpty && _videoFile == null)
                  GestureDetector(
                    onTap: () => _showMediaPicker(),
                    child: Container(
                      height: 120,
                      width: double.infinity,
                      decoration: BoxDecoration(
                        color: Theme.of(context).dividerColor.withValues(alpha: 0.05),
                        borderRadius: BorderRadius.circular(24),
                        border: Border.all(
                          color: Theme.of(context).dividerColor.withValues(alpha: 0.35),
                          width: 2,
                          style: BorderStyle.solid,
                        ),
                      ),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(10),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              shape: BoxShape.circle,
                              boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10)],
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.image_rounded, size: 22, color: Color(0xFFD32F2F)),
                                SizedBox(width: 6),
                                Icon(Icons.videocam_rounded, size: 22, color: Color(0xFFD32F2F)),
                              ],
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Text('Thêm tệp đính kèm', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Text(
                            'Hỗ trợ ảnh và video (Tối đa 50MB)',
                            style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.45), fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ),

                // Preview area when media is selected
                if (_imageFiles.isNotEmpty || _videoFile != null) ...[
                  if (_imageFiles.isNotEmpty) _buildImagePreviewList(),
                  if (_videoFile != null) ...[
                    const SizedBox(height: 12),
                    _buildVideoPreview(),
                  ],
                  if (_otherFiles.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    _buildOtherFilesPreview(),
                  ],
                  const SizedBox(height: 10),
                  // Add more button
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton.icon(
                          onPressed: _showMediaPicker,
                          icon: const Icon(Icons.add_photo_alternate_outlined, size: 18),
                          label: const Text('Thêm tệp đính kèm'),
                          style: OutlinedButton.styleFrom(
                            foregroundColor: const Color(0xFFD32F2F),
                            side: const BorderSide(color: Color(0xFFD32F2F), width: 1),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            padding: const EdgeInsets.symmetric(vertical: 10),
                          ),
                        ),
                      ),
                    ],
                  ),
                ],

                const SizedBox(height: 32),

                // Buttons
                Row(
                  children: [
                    Expanded(
                      child: TextButton(
                        onPressed: _isLoading ? null : () {
                          _titleController.clear();
                          _contentController.clear();
                          setState(() {
                            _imageFiles.clear();
                            _otherFiles.clear();
                          });
                          MainLayout.of(context)?.setIndex(0);
                        },
                        style: TextButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 18),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          backgroundColor: Theme.of(context).dividerColor.withValues(alpha: 0.1),
                        ),
                        child: Text(
                          'Hủy bỏ', 
                          style: TextStyle(
                            color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.6), 
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                          )
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      flex: 2,
                      child: Container(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(20),
                          gradient: const LinearGradient(
                            colors: [Color(0xFFD32F2F), Color(0xFFEF4444)],
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFFD32F2F).withValues(alpha: 0.3),
                              blurRadius: 20,
                              offset: const Offset(0, 8),
                            ),
                          ],
                        ),
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handlePost,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.transparent,
                            shadowColor: Colors.transparent,
                            padding: const EdgeInsets.symmetric(vertical: 18),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          ),
                          child: _isLoading 
                            ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 3))
                            : const Text('Đăng bài ngay', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16, letterSpacing: -0.5)),
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildImagePreviewList() {
    return SizedBox(
      height: 90,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        physics: const BouncingScrollPhysics(),
        itemCount: _imageFiles.length + 1,
        separatorBuilder: (_, _) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          if (index == _imageFiles.length) {
            return InkWell(
              onTap: _pickImages,
              borderRadius: BorderRadius.circular(16),
              child: Container(
                width: 80,
                decoration: BoxDecoration(
                  color: Theme.of(context).dividerColor.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.2)),
                ),
                child: const Icon(Icons.add_photo_alternate_outlined, color: Colors.grey),
              ),
            );
          }
          return Stack(
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Theme.of(context).dividerColor.withValues(alpha: 0.3), width: 2),
                  image: DecorationImage(
                    image: kIsWeb 
                        ? NetworkImage(_imageFiles[index].path) as ImageProvider
                        : FileImage(io.File(_imageFiles[index].path)),
                    fit: BoxFit.cover,
                  ),
                ),
              ),
              Positioned(
                top: 4,
                right: 4,
                child: GestureDetector(
                  onTap: () => _removeImage(index),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.close, size: 12, color: Colors.white),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildOtherFilesPreview() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Tệp đính kèm',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 8),
        ListView.separated(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          itemCount: _otherFiles.length,
          separatorBuilder: (context, index) => const SizedBox(height: 8),
          itemBuilder: (context, index) {
            final file = _otherFiles[index];
            return Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Theme.of(context).cardColor,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.withValues(alpha: 0.2)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.insert_drive_file_rounded, color: Color(0xFFD32F2F)),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          file.name,
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          '${(file.size / 1024).toStringAsFixed(1)} KB',
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 20),
                    onPressed: () => _removeOtherFile(index),
                  ),
                ],
              ),
            );
          },
        ),
      ],
    );
  }

  Widget _buildVideoPreview() {
    return Stack(
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(16),
          child: Container(
            height: 200,
            width: double.infinity,
            color: Colors.black12,
            child: VideoPlayerWidget(videoFile: _videoFile!, autoPlay: false),
          ),
        ),
        Positioned(
          top: 8,
          right: 8,
          child: GestureDetector(
            onTap: _removeVideo,
            child: Container(
              padding: const EdgeInsets.all(8),
              decoration: const BoxDecoration(
                color: Colors.red,
                shape: BoxShape.circle,
              ),
              child: const Icon(Icons.close, size: 18, color: Colors.white),
            ),
          ),
        ),
      ],
    );
  }

  void _removeImage(int index) {
     setState(() {
       _imageFiles.removeAt(index);
     });
  }

  Widget _buildLabel(String text) {
    return Padding(
      padding: const EdgeInsets.only(left: 4),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.w800,
          color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.5),
          letterSpacing: 1.5,
        ),
      ),
    );
  }

  InputDecoration _inputDecoration({required String hint}) {
    return InputDecoration(
      hintText: hint,
      hintStyle: TextStyle(
        fontWeight: FontWeight.w400, 
        fontSize: 15, 
        color: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.3),
      ),
      filled: true,
      fillColor: Theme.of(context).dividerColor.withValues(alpha: 0.05),
      contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 18),
      border: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide.none,
      ),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: BorderSide.none,
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: Color(0xFFD32F2F), width: 1.5),
      ),
      errorBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(20),
        borderSide: const BorderSide(color: Colors.red, width: 1),
      ),
    );
  }
}
