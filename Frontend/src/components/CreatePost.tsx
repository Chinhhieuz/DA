import { useState, useEffect, useRef } from 'react';
import { Image, Video, X, Loader2, Upload, ChevronUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RichTextEditor } from "@/components/ui/RichTextEditor";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from 'sonner'
import { API_URL } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUtils';

interface CreatePostProps {
  onPostCreated: (post: any) => void;
  currentUser: {
    id?: string;
    name: string;
    avatar: string;
    username: string;
  };
}

// Component preview strip: mặc định hiện 2 ảnh, click "+X" để mở rộng
function ImagePreviewStrip({
  previewUrls,
  onRemove,
  onAddMore,
}: {
  previewUrls: string[];
  onRemove: (index: number) => void;
  onAddMore: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const COLLAPSED_COUNT = 2;
  const visibleUrls = expanded ? previewUrls : previewUrls.slice(0, COLLAPSED_COUNT);
  const hiddenCount = previewUrls.length - COLLAPSED_COUNT;

  return (
    <div className="mt-3">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Các thumbnail hiển thị */}
        {visibleUrls.map((url, index) => (
          <div
            key={index}
            className="relative group flex-shrink-0 w-[72px] h-[72px] rounded-xl overflow-hidden border-2 border-border shadow-sm"
          >
            <img src={url} alt={`Ảnh ${index + 1}`} className="w-full h-full object-cover" />
            {/* Overlay xóa khi hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={(e) => { e.preventDefault(); onRemove(index); }}
                className="bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors shadow"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
            {/* Số thứ tự */}
            <div className="absolute bottom-0.5 left-0.5 bg-black/60 text-white text-[8px] font-bold px-1 py-0.5 rounded leading-none">
              {index + 1}
            </div>
          </div>
        ))}

        {/* Badge "+X" — khi chưa mở rộng */}
        {!expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="flex-shrink-0 w-[72px] h-[72px] rounded-xl bg-muted border-2 border-border flex flex-col items-center justify-center gap-0.5 hover:bg-primary/10 hover:border-primary/40 transition-colors shadow-sm"
          >
            <span className="text-foreground text-lg font-black leading-none">+{hiddenCount}</span>
            <span className="text-[9px] text-muted-foreground font-medium">Xem thêm</span>
          </button>
        )}

        {/* Nút thu gọn lại — khi đang mở rộng */}
        {expanded && hiddenCount > 0 && (
          <button
            onClick={() => setExpanded(false)}
            className="flex-shrink-0 w-[72px] h-[72px] rounded-xl bg-muted border-2 border-border flex flex-col items-center justify-center gap-0.5 hover:bg-muted/80 transition-colors shadow-sm"
          >
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
            <span className="text-[9px] text-muted-foreground font-medium">Thu gọn</span>
          </button>
        )}

        {/* Nút thêm media nhanh */}
        <label className="flex-shrink-0 w-[72px] h-[72px] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors group bg-background">
          <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={onAddMore} />
          <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mb-0.5" />
          <span className="text-[9px] text-muted-foreground group-hover:text-primary font-medium">Thêm</span>
        </label>
      </div>
    </div>
  );
}


export function CreatePost({ onPostCreated, currentUser }: CreatePostProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [community, setCommunity] = useState('');
  const [communities, setCommunities] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Lưu trữ File object và preview URL cục bộ — CHƯA upload lên Cloudinary
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [selectedVideoFile, setSelectedVideoFile] = useState<File | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState('');

  // Dọn dẹp object URLs khi component unmount để tránh memory leak
  const previewUrlsRef = useRef<string[]>([]);
  previewUrlsRef.current = previewUrls;
  const videoPreviewUrlRef = useRef('');
  videoPreviewUrlRef.current = videoPreviewUrl;

  useEffect(() => {
    fetch(`${API_URL}/communities`)
      .then(res => res.json())
      .then(data => {
        if (data.status === 'success') setCommunities(data.data);
      })
      .catch(() => console.error('Lỗi tải danh sách cộng đồng!'));

    return () => {
      // Thu hồi các object URL tạm khi unmount
      previewUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      if (videoPreviewUrlRef.current) {
        URL.revokeObjectURL(videoPreviewUrlRef.current);
      }
    };
  }, []);

  const handleUnifiedFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!currentUser.id) {
      toast.error('Bạn cần đăng nhập để đăng tệp đính kèm!');
      e.target.value = '';
      return;
    }

    const imageFiles: File[] = [];
    let newVideoFile: File | null = null;
    let videoRejected = false;

    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      } else if (file.type.startsWith('video/')) {
        if (newVideoFile || selectedVideoFile) {
          if (!videoRejected) {
             toast.warning('Chỉ được phép tải lên tối đa 1 video. Các video sau sẽ bị bỏ qua.');
             videoRejected = true;
          }
        } else {
           const MAX_VIDEO_SIZE = 50 * 1024 * 1024;
           if (file.size > MAX_VIDEO_SIZE) {
             toast.error(`Video quá lớn. Tối đa 50MB`);
           } else {
             newVideoFile = file;
           }
        }
      }
    });

    if (imageFiles.length > 0) {
      const newPreviews = imageFiles.map(file => URL.createObjectURL(file));
      setSelectedFiles(prev => [...prev, ...imageFiles]);
      setPreviewUrls(prev => [...prev, ...newPreviews]);
    }

    if (newVideoFile) {
      if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
      const nextPreview = URL.createObjectURL(newVideoFile);
      setSelectedVideoFile(newVideoFile);
      setVideoPreviewUrl(nextPreview);
    }

    if (imageFiles.length > 0 || newVideoFile) {
      toast.success('Tệp đã được chọn hợp lệ. Sẽ tải lên khi bạn đăng cài.');
    }
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleRemoveVideo = () => {
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setSelectedVideoFile(null);
    setVideoPreviewUrl('');
  };

  const handleSubmit = async () => {
    if (!title.trim() && !community) {
      toast.error('Vui lòng điền tiêu đề và chọn chủ đề bài viết');
      return;
    }
    if (!title.trim()) {
      toast.error('Bạn chưa nhập tiêu đề cho bài viết');
      return;
    }
    if (!community) {
      toast.error('Vui lòng chọn một chủ đề để đăng bài');
      return;
    }
    if (!content.trim()) {
      toast.error('Bạn cần nhập nội dung cho bài viết');
      return;
    }
    if (!currentUser.id) {
      toast.error('Lỗi: Bạn chưa đăng nhập!');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('author_id', currentUser.id!);
      formData.append('title', title);
      formData.append('content', content);
      formData.append('community', community);
      
      // Thêm toàn bộ các file ảnh vào trường 'image'
      selectedFiles.forEach((file) => {
        formData.append('image', file);
      });
      if (selectedVideoFile) {
        formData.append('video', selectedVideoFile);
      }

      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success') {
        toast.success('Đã gửi bài! Hệ thống đang xử lý media và kiểm duyệt ngầm, bài viết sẽ hiện ra sau giây lát.');
        // Dọn dẹp form
        setTitle('');
        setContent('');
        // Thu hồi các object URL tạm
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        if (videoPreviewUrl) {
          URL.revokeObjectURL(videoPreviewUrl);
        }
        setSelectedFiles([]);
        setPreviewUrls([]);
        setSelectedVideoFile(null);
        setVideoPreviewUrl('');
        onPostCreated(data.data);
      } else {
        toast.error(data.message || 'Không thể đăng bài viết, vui lòng thử lại sau');
      }
    } catch (err) {
      toast.error('Không thể kết nối với máy chủ!');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto border-none bg-card rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.15)] overflow-hidden">
      <div className="p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative">
            <Avatar className="h-14 w-14 border-4 border-background shadow-xl ring-2 ring-primary/10">
              <AvatarImage src={getImageUrl(currentUser.avatar)} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary font-bold">{currentUser.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-1 -right-1 bg-green-500 w-4 h-4 rounded-full border-2 border-background shadow-sm"></div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Tạo bài viết mới</h2>
            <p className="text-sm font-medium text-muted-foreground">Đang đăng với danh nghĩa <span className="text-primary">@{currentUser.username}</span></p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Topic Select */}
          <div className="space-y-2">
            <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted-foreground px-1">Chọn chủ đề bài viết</label>
            <Select value={community} onValueChange={setCommunity}>
              <SelectTrigger className="h-12 bg-background border-border rounded-2xl focus:ring-primary/20 focus:border-primary transition-all shadow-sm text-foreground">
                <SelectValue placeholder="Chọn chủ đề để đăng bài..." />
              </SelectTrigger>
              <SelectContent className="bg-card border-border shadow-2xl rounded-2xl overflow-hidden p-1 max-h-[300px]">
                {communities.length === 0 ? (
                  <div className="p-4 text-center text-xs text-muted-foreground">Đang tải chủ đề hoặc chưa có chủ đề nào...</div>
                ) : communities.map((com) => (
                  <SelectItem 
                    key={com._id} 
                    value={com.name} 
                    className="rounded-xl py-3 focus:bg-primary/10 focus:text-primary cursor-pointer text-foreground data-[state=checked]:bg-primary/10 data-[state=checked]:text-primary"
                  >
                    <div className="flex items-center gap-2">
                       <span className="text-lg leading-none">{com.icon || '📚'}</span>
                       <span className="font-medium">{com.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title Input */}
          <div className="space-y-2">
             <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted-foreground px-1">Tiêu đề</label>
             <Input
               placeholder="Nhập tiêu đề ấn tượng..."
               value={title}
               onChange={(e) => setTitle(e.target.value)}
               className="h-14 bg-background border-border rounded-2xl focus:ring-primary/20 focus:border-primary transition-all text-lg font-semibold shadow-sm placeholder:font-normal text-foreground"
             />
          </div>

          {/* Content TextArea */}
          <div className="space-y-2">
             <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted-foreground px-1">Nội dung</label>
             <RichTextEditor
               content={content}
               onChange={setContent}
               placeholder="Bạn đang nghĩ gì? Chia sẻ kiến thức của bạn..."
             />
          </div>

          {/* Media Upload Section — luôn hiện bên dưới nội dung */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted-foreground">Tệp đính kèm (Tùy chọn)</label>
              {(selectedFiles.length > 0 || selectedVideoFile) && (
                <span className="text-[10px] font-semibold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  {[
                    selectedFiles.length > 0 ? `${selectedFiles.length} ảnh` : '',
                    selectedVideoFile ? '1 video' : ''
                  ].filter(Boolean).join(' · ')} · Sẽ tải lên khi đăng
                </span>
              )}
            </div>

            {/* Nút lớn để thêm Media (chỉ hiện khi chưa có ảnh VÀ chưa có video) */}
            {previewUrls.length === 0 && !videoPreviewUrl && (
              <label className="block">
                <div className={`relative flex flex-col items-center justify-center min-h-[120px] rounded-[2rem] border-2 border-dashed transition-all duration-300 cursor-pointer group border-border hover:border-primary/50 hover:bg-primary/5`}>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*,video/*"
                    multiple
                    onChange={handleUnifiedFileSelect}
                  />

                  <div className="flex flex-col items-center p-6">
                    <div className="w-12 h-12 bg-card rounded-2xl shadow-sm border border-border flex items-center justify-center mb-2 group-hover:scale-110 transition-transform gap-2 flex-row">
                      <Image className="h-5 w-5 text-primary" />
                      <Video className="h-5 w-5 text-primary" />
                    </div>
                    <p className="text-sm font-bold text-foreground line-clamp-1">Thêm tệp đính kèm</p>
                    <p className="text-[10px] text-muted-foreground font-medium text-center mt-1">Hỗ trợ ảnh và video (Tối đa 50MB)</p>
                  </div>
                </div>
              </label>
            )}

            {/* Preview Area for mixed media */}
            {(previewUrls.length > 0 || videoPreviewUrl) && (
              <div className="space-y-3">
                {previewUrls.length > 0 && (
                  <ImagePreviewStrip
                    previewUrls={previewUrls}
                    onRemove={handleRemoveImage}
                    onAddMore={handleUnifiedFileSelect}
                  />
                )}
                {/* Nếu chưa có ảnh thì render một nút AddMore riêng */}
                {previewUrls.length === 0 && videoPreviewUrl && (
                  <div className="flex items-center gap-2 mb-2">
                    <label className="flex-shrink-0 w-[72px] h-[72px] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors group bg-card">
                      <input type="file" className="hidden" accept="image/*,video/*" multiple onChange={handleUnifiedFileSelect} />
                      <Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors mb-0.5" />
                      <span className="text-[9px] text-muted-foreground group-hover:text-primary font-medium">Thêm</span>
                    </label>
                  </div>
                )}
                
                {videoPreviewUrl && (
                  <div className="relative rounded-2xl overflow-hidden border border-border bg-muted/30 p-2">
                    <video src={videoPreviewUrl} controls className="w-full max-h-[320px] rounded-xl bg-black" />
                    <button
                      onClick={handleRemoveVideo}
                      className="absolute top-4 right-4 bg-red-500/80 text-white rounded-full p-2 hover:bg-red-600 transition-colors shadow-md backdrop-blur-sm"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              disabled={isSubmitting}
              onClick={() => {
                setTitle('');
                setContent('');
                previewUrls.forEach(url => URL.revokeObjectURL(url));
                if (videoPreviewUrl) {
                  URL.revokeObjectURL(videoPreviewUrl);
                }
                setSelectedFiles([]);
                setPreviewUrls([]);
                setSelectedVideoFile(null);
                setVideoPreviewUrl('');
              }}
              className="flex-1 h-14 rounded-2xl border-border text-muted-foreground hover:bg-muted font-bold tracking-tight transition-all"
            >
              Hủy bỏ
            </Button>
            <Button
              className="flex-[2] h-14 rounded-2xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold tracking-tight shadow-[0_10px_20px_rgba(220,38,38,0.2)] hover:shadow-[0_15px_25px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {selectedFiles.length > 0 || selectedVideoFile
                    ? `Đang tải ${selectedFiles.length} ảnh${selectedVideoFile ? ' + 1 video' : ''}...`
                    : 'Đang đăng...'}
                </span>
              ) : (
                'Đăng bài ngay'
              )}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
