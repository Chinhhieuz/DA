import 'package:flutter/material.dart';

class PostDetailScreen extends StatelessWidget {
  const PostDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        backgroundColor: Theme.of(context).cardColor,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
        title: const Text(
          'Bài viết',
          style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
        ),
      ),
      body: Center(
        child: Container(
          constraints: const BoxConstraints(maxWidth: 800),
          child: Column(
            children: [
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      // Post Content
                      Container(
                        color: Theme.of(context).cardColor,
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const CircleAvatar(
                                  radius: 20,
                                  backgroundImage: NetworkImage(
                                    'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100',
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment:
                                        CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        children: [
                                          Flexible(
                                            child: Text(
                                              'd/laptrinh',
                                              style: TextStyle(
                                                fontWeight: FontWeight.bold,
                                                fontSize: 13,
                                                color: Theme.of(context).colorScheme.onSurface,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          Text(
                                            ' • ',
                                            style: TextStyle(
                                              color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                                            ),
                                          ),
                                          Flexible(
                                            child: Text(
                                              'Tô Chính Hiệu',
                                              style: TextStyle(
                                                fontWeight: FontWeight.w500,
                                                fontSize: 14,
                                                color: Theme.of(context).colorScheme.onSurface,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          const SizedBox(width: 4),
                                          Flexible(
                                            child: Text(
                                              '(@tochinhhieu)',
                                              style: TextStyle(
                                                color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                                                fontSize: 13,
                                              ),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 2),
                                      const Text(
                                        '2 giờ trước',
                                        style: TextStyle(
                                          color: Colors.grey,
                                          fontSize: 12,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            Text(
                              'Làm thế nào để cải thiện kỹ năng lập trình Flutter?',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                height: 1.3,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 12),
                            Text(
                              'Mình đang học Flutter được 2 tháng và cảm thấy phần quản lý trạng thái (State Management) khá phức tạp. Mọi người thường dùng Provider, Riverpod hay BLoC cho dự án thực tế ạ? Có tài liệu nào dễ hiểu không, xin cảm ơn!',
                              style: TextStyle(
                                fontSize: 16,
                                color: Theme.of(context).colorScheme.onSurface,
                                height: 1.6,
                              ),
                            ),
                            const SizedBox(height: 24),
                            // Action Buttons
                            Wrap(
                              spacing: 8,
                              runSpacing: 8,
                              children: [
                                Container(
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).dividerColor.withAlpha((0.1 * 255).round()),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      IconButton(
                                        icon: const Icon(
                                          Icons.arrow_upward,
                                          color: Color(0xFFD32F2F),
                                          size: 20,
                                        ),
                                        onPressed: () {},
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        constraints: const BoxConstraints(),
                                      ),
                                      Text(
                                        '124',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          color: Theme.of(context).colorScheme.onSurface,
                                        ),
                                      ),
                                      IconButton(
                                        icon: Icon(
                                          Icons.arrow_downward,
                                          color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                                          size: 20,
                                        ),
                                        onPressed: () {},
                                        padding: const EdgeInsets.symmetric(
                                          horizontal: 8,
                                          vertical: 4,
                                        ),
                                        constraints: const BoxConstraints(),
                                      ),
                                    ],
                                  ),
                                ),
                                _buildActionButton(
                                  context,
                                  Icons.chat_bubble_outline,
                                  '45 Bình luận',
                                ),
                                _buildActionButton(
                                  context,
                                  Icons.bookmark_border,
                                  'Lưu',
                                ),
                                IconButton(
                                  icon: Icon(
                                    Icons.share_outlined,
                                    color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                                  ),
                                  onPressed: () {},
                                ),
                                IconButton(
                                  icon: Icon(
                                    Icons.more_horiz,
                                    color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                                  ),
                                  onPressed: () {},
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),

                      // Comments Section
                      Container(
                        color: Theme.of(context).cardColor,
                        margin: const EdgeInsets.only(top: 8),
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Bình luận (45)',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Theme.of(context).colorScheme.onSurface,
                              ),
                            ),
                            const SizedBox(height: 24),

                            // Comment Thread 1
                            _buildCommentThread(
                              context: context,
                              author: 'Nguyễn Văn A',
                              time: '1 giờ trước',
                              content:
                                  'Riverpod đang là xu hướng hiện nay. BLoC cũng rất tốt nhưng hơi nhiều boilerplate code. Nếu mới học mình khuyên nên bắt đầu với Provider, sau đó chuyển sang Riverpod sẽ dễ hiểu hơn.',
                              upvotes: '32',
                              replies: [
                                _buildCommentThread(
                                  context: context,
                                  author: 'Tô Chính Hiệu',
                                  time: '45 phút trước',
                                  content:
                                      'Cảm ơn bạn. Mình sẽ tìm hiểu thử Riverpod.',
                                  upvotes: '2',
                                  isAuthor: true,
                                ),
                              ],
                            ),

                            // Comment Thread 2
                            _buildCommentThread(
                              context: context,
                              author: 'Trần Thị B',
                              time: '30 phút trước',
                              content:
                                  'Bạn có thể xem kênh YouTube của Reso Coder hoặc FilledStacks nhé, giải thích rất kỹ về kiến trúc.',
                              upvotes: '15',
                              hasImageAttachment: true,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),

              // Bottom Input Area (Sticky)
              Container(
                padding: EdgeInsets.only(
                  left: 24,
                  right: 24,
                  top: 16,
                  bottom: MediaQuery.of(context).padding.bottom + 16,
                ),
                decoration: BoxDecoration(
                  color: Theme.of(context).cardColor,
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withAlpha((0.05 * 255).round()),
                      blurRadius: 10,
                      offset: const Offset(0, -5),
                    ),
                  ],
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    Expanded(
                      child: Container(
                        decoration: BoxDecoration(
                          color: Theme.of(context).cardColor,
                          borderRadius: BorderRadius.circular(24),
                          border: Border.all(color: Theme.of(context).dividerColor),
                        ),
                        child: Row(
                          children: [
                            IconButton(
                              icon: Icon(
                                Icons.camera_alt_outlined,
                                color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                              ),
                              onPressed: () {},
                            ),
                            const Expanded(
                              child: TextField(
                                maxLines: null,
                                decoration: InputDecoration(
                                  hintText: 'Thêm bình luận...',
                                  border: InputBorder.none,
                                  isDense: true,
                                  contentPadding: EdgeInsets.symmetric(
                                    vertical: 12,
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Container(
                      decoration: const BoxDecoration(
                        color: Color(0xFFD32F2F),
                        shape: BoxShape.circle,
                      ),
                      child: IconButton(
                        icon: const Icon(
                          Icons.send,
                          color: Colors.white,
                          size: 20,
                        ),
                        onPressed: () {},
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

  Widget _buildActionButton(BuildContext context, IconData icon, String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: Theme.of(context).dividerColor.withAlpha((0.1 * 255).round()),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round())),
          const SizedBox(width: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 13,
              fontWeight: FontWeight.bold,
              color: Theme.of(context).colorScheme.onSurface,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCommentThread({
    required BuildContext context,
    required String author,
    required String time,
    required String content,
    required String upvotes,
    bool isAuthor = false,
    bool hasImageAttachment = false,
    List<Widget>? replies,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const CircleAvatar(
            radius: 16,
            backgroundImage: NetworkImage(
              'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100',
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Theme.of(context).dividerColor.withAlpha((0.05 * 255).round()),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            author,
                            style: TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 13,
                              color: Theme.of(context).colorScheme.onSurface,
                            ),
                          ),
                          if (isAuthor) ...[
                            const SizedBox(width: 6),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 6,
                                vertical: 2,
                              ),
                              decoration: BoxDecoration(
                                color: Theme.of(context).colorScheme.primary,
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'Tác giả',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          ],
                          const SizedBox(width: 6),
                          Text(
                            '• $time',
                            style: TextStyle(
                              color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        content,
                        style: TextStyle(
                          fontSize: 14,
                          color: Theme.of(context).colorScheme.onSurface,
                          height: 1.4,
                        ),
                      ),
                      if (hasImageAttachment) ...[
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(8),
                          child: Image.network(
                            'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=400',
                            height: 150,
                            width: 250,
                            fit: BoxFit.cover,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    const SizedBox(width: 12),
                    Text(
                      upvotes,
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurface,
                      ),
                    ),
                    const SizedBox(width: 4),
                    Text(
                      'Lượt thích',
                      style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round())),
                    ),
                    const SizedBox(width: 16),
                    Text(
                      'Phản hồi',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Theme.of(context).colorScheme.onSurface.withAlpha((0.6 * 255).round()),
                      ),
                    ),
                  ],
                ),
                if (replies != null && replies.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  Container(
                    margin: const EdgeInsets.only(left: 16),
                    decoration: BoxDecoration(
                      border: Border(
                        left: BorderSide(color: Theme.of(context).dividerColor),
                      ),
                    ),
                    padding: const EdgeInsets.only(left: 16),
                    child: Column(children: replies),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
