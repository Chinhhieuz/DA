import 'dart:typed_data';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import 'package:path_provider/path_provider.dart';
import 'package:image_gallery_saver_plus/image_gallery_saver_plus.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:device_info_plus/device_info_plus.dart';

class MediaUtils {
  static Future<bool> _requestPermission() async {
    if (Platform.isAndroid) {
      final deviceInfo = DeviceInfoPlugin();
      final androidInfo = await deviceInfo.androidInfo;
      
      if (androidInfo.version.sdkInt >= 33) {
        // Android 13+ (API 33+)
        final statuses = await [
          Permission.photos,
          Permission.videos,
        ].request();
        
        return statuses[Permission.photos]!.isGranted || statuses[Permission.videos]!.isGranted;
      } else {
        // Android 12 or lower
        final status = await Permission.storage.request();
        return status.isGranted;
      }
    } else if (Platform.isIOS) {
       final status = await Permission.photos.request();
       return status.isGranted;
    }
    
    // Default fallback
    final status = await Permission.storage.request();
    return status.isGranted;
  }

  static Future<void> downloadVideo(BuildContext context, String videoUrl) async {
    // ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đang tải xuống video...')));
    try {
      if (!(await _requestPermission())) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Bạn cần cấp quyền lưu trữ để tải video.')));
        }
      }
      
      var appDocDir = await getTemporaryDirectory();
      String savePath = "${appDocDir.path}/temp_video_${DateTime.now().millisecondsSinceEpoch}.mp4";
      
      await Dio().download(videoUrl, savePath);
      final result = await ImageGallerySaverPlus.saveFile(savePath);
      
      if (result != null && result['isSuccess'] == true) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã lưu video vào thư viện!')));
        }
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lỗi: Không thể lưu video.')));
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi tải xuống: $e')));
      }
    }
  }

  static Future<void> downloadImage(BuildContext context, String imageUrl) async {
    // ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đang tải xuống ảnh...')));
    try {
      if (!(await _requestPermission())) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Bạn cần cấp quyền lưu trữ để tải ảnh.')));
        }
      }

      var response = await Dio().get(imageUrl, options: Options(responseType: ResponseType.bytes));
      final result = await ImageGallerySaverPlus.saveImage(
        Uint8List.fromList(response.data),
        quality: 100,
        name: "messenger_download_${DateTime.now().millisecondsSinceEpoch}"
      );
      
      if (result != null && result['isSuccess'] == true) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Đã lưu ảnh vào thư viện!')));
        }
      } else {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Lỗi: Không thể lưu ảnh.')));
        }
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Lỗi tải xuống: $e')));
      }
    }
  }
}
