import '../services/api_constants.dart';

class User {
  final String id;
  final String username;
  final String email;
  final String? profilePicture;
  final String? displayName;
  final String? bio;
  final String? location;
  final String? website;
  final List<String> savedPosts;
  final String? role;
  final int followersCount;
  final int followingCount;
  bool isFollowing;
  final String? mssv;
  final String? faculty;
  final Map<String, dynamic> preferences;

  String? get fullProfilePicture {
    if (profilePicture == null || profilePicture!.isEmpty) return null;
    if (profilePicture!.startsWith('http')) return profilePicture;
    // Replace /uploads with base URL
    String path = profilePicture!;
    if (path.startsWith('/')) path = path.substring(1);
    return '${ApiConstants.baseUrl.replaceAll('/api', '')}/$path';
  }

  User({
    required this.id,
    required this.username,
    required this.email,
    this.profilePicture,
    this.displayName,
    this.bio,
    this.location,
    this.website,
    this.savedPosts = const [],
    this.role,
    this.followersCount = 0,
    this.followingCount = 0,
    this.isFollowing = false,
    this.mssv,
    this.faculty,
    this.preferences = const {},
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['_id'] ?? json['id'] ?? '',
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      profilePicture: json['avatar_url'] ?? json['profilePicture'],
      displayName: json['display_name'] ?? json['full_name'],
      bio: json['bio'],
      location: json['location'],
      website: json['website'],
      savedPosts: json['savedPosts'] != null ? List<String>.from(json['savedPosts']) : [],
      role: json['role'],
      followersCount: json['followersCount'] ?? 0,
      followingCount: json['followingCount'] ?? 0,
      isFollowing: json['isFollowing'] ?? false,
      mssv: json['mssv'],
      faculty: json['faculty'],
      preferences: json['preferences'] != null ? Map<String, dynamic>.from(json['preferences']) : {},
    );
  }

  Map<String, dynamic> toJson() {
    return {
      '_id': id,
      'username': username,
      'email': email,
      'avatar_url': profilePicture,
      'display_name': displayName,
      'bio': bio,
      'location': location,
      'website': website,
      'savedPosts': savedPosts,
      'role': role,
      'mssv': mssv,
      'faculty': faculty,
      'preferences': preferences,
    };
  }
}
