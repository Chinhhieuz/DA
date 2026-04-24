import 'package:flutter/material.dart';

class RulesScreen extends StatelessWidget {
  const RulesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final screenWidth = MediaQuery.of(context).size.width;
    final isDesktop = screenWidth > 800;

    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Nội quy', style: TextStyle(color: Theme.of(context).colorScheme.onSurface, fontWeight: FontWeight.bold, fontSize: 18)),
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
                    Row(
                      children: [
                        const Icon(Icons.shield_outlined, size: 28, color: Color(0xFFD32F2F)),
                        const SizedBox(width: 12),
                        Text('Quy định chung', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Theme.of(context).colorScheme.onSurface)),
                      ],
                    ),
                    const SizedBox(height: 24),
                    _buildRuleItem(context, '1. Tôn trọng người dùng khác', 'Không sử dụng ngôn từ kích động, lăng mạ, phân biệt đối xử hoặc đe dọa các thành viên khác trong cộng đồng.'),
                    const SizedBox(height: 16),
                    _buildRuleItem(context, '2. Không spam / quảng cáo', 'Nghiêm cấm mọi hành vi spam bài viết, bình luận, hoặc đăng tải nội dung quảng cáo không được phép.'),
                    const SizedBox(height: 16),
                    _buildRuleItem(context, '3. Đăng bài đúng chuyên mục', 'Hãy chọn đúng cộng đồng và gắn thẻ (tag) phù hợp với nội dung bài viết của bạn để mọi người dễ dàng tìm kiếm.'),
                    const SizedBox(height: 16),
                    _buildRuleItem(context, '4. Không chia sẻ nội dung độc hại', 'Tuyệt đối không đăng tải, chia sẻ các đường dẫn chứa mã độc, phần mềm khiêu dâm, vi phạm bản quyền hay trái với pháp luật.'),
                    const SizedBox(height: 32),
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(color: Theme.of(context).brightness == Brightness.light ? const Color(0xFFFDE8E8) : const Color(0xFF450A0A), borderRadius: BorderRadius.circular(8)),
                      child: const Row(
                        children: [
                          Icon(Icons.warning_amber_rounded, color: Color(0xFFD32F2F)),
                          SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              'Vi phạm các quy định trên có thể dẫn đến việc tài khoản bị cấm (ban) tạm thời hoặc vĩnh viễn mà không cần báo trước.',
                              style: TextStyle(color: Color(0xFFD32F2F), fontSize: 14),
                            ),
                          ),
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

  Widget _buildRuleItem(BuildContext context, String title, String desc) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: TextStyle(fontWeight: FontWeight.w600, fontSize: 16, color: Theme.of(context).colorScheme.onSurface)),
        const SizedBox(height: 6),
        Text(desc, style: TextStyle(fontSize: 14, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()), height: 1.5)),
        const SizedBox(height: 16),
        Divider(color: Theme.of(context).dividerColor),
      ],
    );
  }
}
