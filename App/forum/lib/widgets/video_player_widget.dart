import 'dart:io' as io;
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import 'package:image_picker/image_picker.dart';

class VideoPlayerWidget extends StatefulWidget {
  final String? videoUrl;
  final XFile? videoFile;
  final bool autoPlay;
  final bool looping;
  final bool muted;
  final VoidCallback? onTap;
  final bool showPlayButton;

  const VideoPlayerWidget({
    super.key,
    this.videoUrl,
    this.videoFile,
    this.autoPlay = true,
    this.looping = true,
    this.muted = true,
    this.onTap,
    this.showPlayButton = true,
  }) : assert(videoUrl != null || videoFile != null, 'At least videoUrl or videoFile must be provided');

  @override
  State<VideoPlayerWidget> createState() => _VideoPlayerWidgetState();
}

class _VideoPlayerWidgetState extends State<VideoPlayerWidget> {
  late VideoPlayerController _controller;
  bool _isInit = false;
  
  @override
  void initState() {
    super.initState();
    if (widget.videoFile != null) {
      if (kIsWeb) {
        _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoFile!.path));
      } else {
        _controller = VideoPlayerController.file(io.File(widget.videoFile!.path));
      }
    } else {
      _controller = VideoPlayerController.networkUrl(Uri.parse(widget.videoUrl!));
    }
    
    _controller.initialize().then((_) {
      if (mounted) {
        setState(() => _isInit = true);
        _controller.setLooping(widget.looping);
        _controller.setVolume(widget.muted ? 0.0 : 1.0);
        if (widget.autoPlay) {
          _controller.play();
        }
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, "0");
    String minutes = twoDigits(duration.inMinutes.remainder(60));
    String seconds = twoDigits(duration.inSeconds.remainder(60));
    return "$minutes:$seconds";
  }

  @override
  Widget build(BuildContext context) {
    if (!_isInit) {
      return Container(
        height: 200,
        width: double.infinity,
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Center(child: CircularProgressIndicator(color: Colors.white)),
      );
    }

    return GestureDetector(
      onTap: widget.onTap ?? () {
        setState(() {
          _controller.value.isPlaying ? _controller.pause() : _controller.play();
        });
      },
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.black,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Stack(
          alignment: Alignment.center,
          children: [
            AspectRatio(
              aspectRatio: _controller.value.aspectRatio,
              child: VideoPlayer(_controller),
            ),
            
            // Interaction Overlay
            Positioned.fill(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.end,
                children: [
                  const Spacer(),
                  if (!_controller.value.isPlaying)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(color: Colors.black45, shape: BoxShape.circle),
                      child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 40),
                    ),
                  const Spacer(),
                  // Bottom Bar
                  Container(
                    padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [Colors.transparent, Colors.black.withValues(alpha: 0.7)],
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        VideoProgressIndicator(
                          _controller,
                          allowScrubbing: true,
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          colors: VideoProgressColors(
                            playedColor: Theme.of(context).colorScheme.primary,
                            bufferedColor: Colors.white24,
                            backgroundColor: Colors.white10,
                          ),
                        ),
                        Row(
                          children: [
                            ValueListenableBuilder(
                              valueListenable: _controller,
                              builder: (context, VideoPlayerValue value, child) {
                                return Text(
                                  "${_formatDuration(value.position)} / ${_formatDuration(value.duration)}",
                                  style: const TextStyle(color: Colors.white, fontSize: 10),
                                );
                              },
                            ),
                            const Spacer(),
                            IconButton(
                              icon: Icon(
                                _controller.value.volume > 0 ? Icons.volume_up_rounded : Icons.volume_off_rounded,
                                color: Colors.white,
                                size: 18,
                              ),
                              onPressed: () {
                                setState(() {
                                  _controller.setVolume(_controller.value.volume > 0 ? 0 : 1.0);
                                });
                              },
                              constraints: const BoxConstraints(),
                              padding: const EdgeInsets.all(8),
                            ),
                          ],
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
    );
  }
}
