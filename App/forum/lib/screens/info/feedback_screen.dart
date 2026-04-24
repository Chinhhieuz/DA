import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import '../../services/api_constants.dart';
import '../../services/auth_service.dart';

class FeedbackScreen extends StatefulWidget {
  const FeedbackScreen({super.key});

  @override
  State<FeedbackScreen> createState() => _FeedbackScreenState();
}

class _FeedbackScreenState extends State<FeedbackScreen> {
  String _feedbackType = 'suggestion';
  final TextEditingController _contentController = TextEditingController();
  bool _isSubmitting = false;

  Future<void> _submitFeedback() async {
    final content = _contentController.text.trim();
    if (content.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Vui lòng nhập nội dung góp ý')));
      return;
    }
    
    setState(() => _isSubmitting = true);
    try {
      final response = await http.post(
        Uri.parse(ApiConstants.feedback),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'user_id': AuthService.currentUser?.id,
          'content': content,
          'type': _feedbackType,
        }),
      );
      final result = jsonDecode(response.body);
      if (response.statusCode == 200 && result['status'] == 'success') {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Cảm ơn bạn đã gửi đóng góp ý kiến!')));
        Navigator.pop(context);
      } else {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(result['message'] ?? 'Lỗi gửi góp ý')));
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lỗi kết nối server')));
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  void dispose() {
    _contentController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth > 800;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Đóng góp ý kiến', style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Theme.of(context).appBarTheme.backgroundColor,
        elevation: 1,
      ),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 800),
          child: ListView(
            padding: EdgeInsets.all(isDesktop ? 24.0 : 0.0),
            children: [
              Container(
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  borderRadius: BorderRadius.circular(isDesktop ? 12 : 0),
                  border: isDesktop ? Border.all(color: Theme.of(context).dividerColor) : null,
                ),
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Hãy giúp chúng tôi hoàn thiện hơn!', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                    const SizedBox(height: 8),
                    Text('Phản hồi của bạn rất quan trọng để chúng tôi cải thiện Linky mỗi ngày.', style: TextStyle(color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()), fontSize: 14)),
                    const SizedBox(height: 32),
                    
                    Text('Bạn muốn đóng góp về vấn đề gì?', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: Theme.of(context).colorScheme.onSurface)),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: _feedbackType,
                      decoration: InputDecoration(
                        filled: true,
                        fillColor: Theme.of(context).inputDecorationTheme.fillColor ?? Colors.grey.shade50,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                      ),
                      items: const [
                        DropdownMenuItem(value: 'suggestion', child: Text('Góp ý tính năng')),
                        DropdownMenuItem(value: 'bug', child: Text('Báo lỗi')),
                        DropdownMenuItem(value: 'other', child: Text('Khác')),
                      ],
                      onChanged: (v) {
                        if (v != null) setState(() => _feedbackType = v);
                      },
                    ),
                    
                    const SizedBox(height: 24),
                    Text('Mô tả chi tiết', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: Theme.of(context).colorScheme.onSurface)),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _contentController,
                      maxLines: 6,
                      decoration: InputDecoration(
                        hintText: 'Hãy chia sẻ chi tiết ý kiến hoặc vấn đề bạn gặp phải...',
                        filled: true,
                        fillColor: Theme.of(context).inputDecorationTheme.fillColor ?? Colors.grey.shade50,
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: BorderSide.none),
                      ),
                    ),
                    
                    const SizedBox(height: 32),
                    Align(
                      alignment: Alignment.centerRight,
                      child: ElevatedButton(
                        onPressed: _isSubmitting ? null : _submitFeedback,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFFD32F2F),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        child: Text(
                          _isSubmitting ? 'Đang gửi...' : 'Gửi phản hồi', 
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        ),
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
}
