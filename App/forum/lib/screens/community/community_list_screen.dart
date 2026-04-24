import 'package:flutter/material.dart';
import '../../services/community_service.dart';
import '../../models/community.dart';
import 'community_detail_screen.dart';

class CommunityListScreen extends StatefulWidget {
  const CommunityListScreen({super.key});

  @override
  State<CommunityListScreen> createState() => _CommunityListScreenState();
}

class _CommunityListScreenState extends State<CommunityListScreen> {
  List<Community> _communities = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchCommunities();
  }

  Future<void> _fetchCommunities() async {
    final list = await CommunityService.getCommunities();
    if (mounted) {
      setState(() {
        _communities = list;
        _isLoading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Theme.of(context).scaffoldBackgroundColor,
      appBar: AppBar(
        title: Text('Khám phá', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Theme.of(context).colorScheme.onSurface)),
        automaticallyImplyLeading: false,
        backgroundColor: Theme.of(context).cardColor,
        foregroundColor: Theme.of(context).colorScheme.onSurface,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: _fetchCommunities,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          'Khám phá chủ đề hiện có',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).colorScheme.onSurface,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(
                            color: const Color(0xFF1D4ED8),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Text(
                            '${_communities.length}',
                            style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 20),
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        crossAxisSpacing: 12,
                        mainAxisSpacing: 12,
                        childAspectRatio: 1.5,
                      ),
                      itemCount: _communities.length,
                      itemBuilder: (context, index) {
                        return _buildCommunityCard(_communities[index]);
                      },
                    ),
                  ],
                ),
              ),
      ),
    );
  }

  Widget _buildCommunityCard(Community community) {
    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) => CommunityDetailScreen(community: community),
          ),
        );
      },
      child: Container(
        decoration: BoxDecoration(
          color: Theme.of(context).cardColor,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: Theme.of(context).dividerColor),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withAlpha((0.02 * 255).round()),
              blurRadius: 4,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Row(
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: Theme.of(context).brightness == Brightness.light ? const Color(0xFFFEF2F2) : const Color(0xFF450A0A),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Center(
                    child: Text(
                      community.icon,
                      style: const TextStyle(fontSize: 20),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        community.name,
                        style: TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: Theme.of(context).colorScheme.onSurface,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${community.postCount} bài viết',
                        style: TextStyle(
                          fontSize: 11,
                          color: Theme.of(context).colorScheme.onSurface.withAlpha((0.5 * 255).round()),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
