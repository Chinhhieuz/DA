import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import '../../models/post.dart';
import '../../services/post_service.dart';
import '../../services/api_constants.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../../services/auth_service.dart';

class ReportScreen extends StatefulWidget {
  final Post post;
  const ReportScreen({super.key, required this.post});

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  String? _selectedReason;
  final _noteController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  final List<XFile> _evidenceImages = [];
  bool _isSubmitting = false;

  final List<Map<String, String>> _reasons = [
    {'title': 'Quấy rối', 'subtitle': 'Cá nhân tôi hoặc người khác đang bị quấy rối.'},
    {'title': 'Spam', 'subtitle': 'Nội dung trùng lặp, quảng cáo quá mức.'},
    {'title': 'Nội dung bạo lực', 'subtitle': 'Hình ảnh hoặc ngôn từ cổ xúy bạo lực.'},
    {'title': 'Thông tin sai sự thật', 'subtitle': 'Tin giả hoặc nội dung gây hiểu lầm.'},
    {'title': 'Hận thù', 'subtitle': 'Ngôn từ xúc phạm, phân biệt đối xử.'},
    {'title': 'Khác', 'subtitle': 'Vấn đề vi phạm đạo đức cộng đồng khác.'},
  ];

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _pickImage() async {
    if (_evidenceImages.length >= 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Chỉ được đính kèm tối đa 3 ảnh bằng chứng!')),
      );
      return;
    }
    try {
      final XFile? image = await _picker.pickImage(source: ImageSource.gallery, imageQuality: 80);
      if (image != null) {
        setState(() {
          _evidenceImages.add(image);
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Không thể chọn ảnh: $e')),
        );
      }
    }
  }

  void _removeImage(int index) {
    setState(() {
      _evidenceImages.removeAt(index);
    });
  }

  Future<void> _submitReport() async {
    if (_selectedReason == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng chọn một lý do báo cáo')),
      );
      return;
    }

    final String? reporterId = AuthService.currentUser?.id;
    if (reporterId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng đăng nhập để gửi báo cáo!')),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      List<String> uploadedUrls = [];
      String uploadBaseUrl = ApiConstants.baseUrl.replaceAll('/api', '');
      
      // Upload images one by one
      for (var file in _evidenceImages) {
        final request = http.MultipartRequest(
          'POST', 
          Uri.parse('$uploadBaseUrl/upload?user_id=$reporterId')
        );
        request.files.add(
          await http.MultipartFile.fromPath('image', file.path)
        );

        final response = await request.send();
        if (response.statusCode == 200) {
          final respStr = await response.stream.bytesToString();
          final uploadData = jsonDecode(respStr);
          if (uploadData['status'] == 'success') {
            uploadedUrls.add(uploadData['data']['url']);
          } else {
            throw Exception(uploadData['message'] ?? 'Upload thất bại');
          }
        } else {
          throw Exception('Lỗi server khi upload ảnh');
        }
      }

      final reason = _selectedReason!;
      final notes = _noteController.text.trim();

      final result = await PostService.reportPost(widget.post.id, reason, notes, uploadedUrls);

      if (mounted) {
        setState(() => _isSubmitting = false);
        if (result['success']) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(result['message'] ?? 'Cảm ơn bạn! Báo cáo đã được gửi đi.'), backgroundColor: Colors.green),
          );
          Navigator.pop(context);
        } else {
          throw Exception(result['message'] ?? 'Lỗi khi gửi báo cáo');
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isSubmitting = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Báo cáo bài viết', style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
        elevation: 1,
        iconTheme: IconThemeData(color: Theme.of(context).colorScheme.onSurface),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Bạn đang báo cáo bài viết:', style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()), fontSize: 14)),
            const SizedBox(height: 8),
            Text(widget.post.title, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
            const SizedBox(height: 32),
            const Text('Tại sao bạn báo cáo nội dung này?', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
            const SizedBox(height: 16),
            ..._reasons.map((opt) => _buildReportOption(context, opt['title']!, opt['subtitle']!)),
            const SizedBox(height: 32),
            const Text('Ghi chú thêm (không bắt buộc)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 12),
            TextField(
              controller: _noteController,
              maxLines: 4,
              decoration: InputDecoration(
                hintText: 'Cung cấp thêm chi tiết để chúng tôi xem xét...',
                filled: true,
                fillColor: Theme.of(context).cardColor,
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).dividerColor)),
                enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide(color: Theme.of(context).dividerColor)),
              ),
            ),
            const SizedBox(height: 32),
            const Text('Bằng chứng hình ảnh (Tối đa 3 ảnh)', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                ..._evidenceImages.asMap().entries.map((entry) {
                  final index = entry.key;
                  final file = entry.value;
                  return Stack(
                    children: [
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          image: DecorationImage(
                            image: FileImage(File(file.path)),
                            fit: BoxFit.cover,
                          ),
                          border: Border.all(color: Theme.of(context).dividerColor),
                        ),
                      ),
                      Positioned(
                        top: -4,
                        right: -4,
                        child: IconButton(
                          onPressed: () => _removeImage(index),
                          icon: Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(
                              color: Colors.black87,
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(Icons.close, color: Colors.white, size: 16),
                          ),
                          constraints: const BoxConstraints(),
                          padding: EdgeInsets.zero,
                        ),
                      )
                    ],
                  );
                }),
                
                if (_evidenceImages.length < 3)
                  GestureDetector(
                    onTap: _pickImage,
                    child: Container(
                      width: 80,
                      height: 80,
                      decoration: BoxDecoration(
                        color: Theme.of(context).cardColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Theme.of(context).dividerColor, style: BorderStyle.solid),
                      ),
                      child: const Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.add_photo_alternate_outlined, color: Colors.grey),
                          SizedBox(height: 4),
                          Text('Thêm', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ),
                  )
              ],
            ),
            const SizedBox(height: 32),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: _isSubmitting ? null : _submitReport,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD32F2F),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                child: _isSubmitting 
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                  : const Text('Gửi báo cáo', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildReportOption(BuildContext context, String title, String subtitle) {
    final isSelected = _selectedReason == title;
    return InkWell(
      onTap: () {
        setState(() {
          _selectedReason = title;
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFFD32F2F).withValues(alpha: 0.05) : null,
          border: Border(bottom: BorderSide(color: Theme.of(context).dividerColor))
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: TextStyle(fontWeight: isSelected ? FontWeight.bold : FontWeight.w600, fontSize: 15, color: isSelected ? const Color(0xFFD32F2F) : Theme.of(context).colorScheme.onSurface)),
                  const SizedBox(height: 4),
                  Text(subtitle, style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()), fontSize: 13)),
                ],
              ),
            ),
            if (isSelected)
              const Icon(Icons.check_circle, color: Color(0xFFD32F2F), size: 20)
            else
              Icon(Icons.chevron_right, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.4 * 255).round()), size: 20),
          ],
        ),
      ),
    );
  }
}
