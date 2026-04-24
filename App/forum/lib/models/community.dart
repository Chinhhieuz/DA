class Community {
  final String id;
  final String name;
  final String? description;
  final String icon;
  final int memberCount;
  final int postCount;

  Community({
    required this.id,
    required this.name,
    this.description,
    required this.icon,
    required this.memberCount,
    required this.postCount,
  });

  factory Community.fromJson(Map<String, dynamic> json) {
    return Community(
      id: json['_id'] ?? '',
      name: json['name'] ?? '',
      description: json['description'],
      icon: json['icon'] ?? '👥',
      memberCount: json['memberCount'] ?? 0,
      postCount: json['postCount'] ?? 0,
    );
  }
}

