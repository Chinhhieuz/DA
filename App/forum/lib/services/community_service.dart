import 'dart:convert';
import 'package:http/http.dart' as http;
import 'api_constants.dart';
import '../models/community.dart';

class CommunityService {
  static Future<List<Community>> getCommunities() async {
    try {
      final response = await http.get(Uri.parse(ApiConstants.communities));
      
      if (response.statusCode == 200) {
        final result = jsonDecode(response.body);
        if (result['status'] == 'success') {
          final List<dynamic> data = result['data'];
          return data.map((json) => Community.fromJson(json)).toList();
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  }
}

