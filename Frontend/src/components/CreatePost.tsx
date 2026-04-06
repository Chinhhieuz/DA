import { useState, useEffect, useRef } from 'react';
import { Image, Link2, FileText, X, Loader2, Upload, ChevronDown, ChevronUp } from 'lucide-react';
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

        {/* Nút thêm ảnh nhanh */}
        <label className="flex-shrink-0 w-[72px] h-[72px] rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors group">
          <input type="file" className="hidden" accept="image/*" multiple onChange={onAddMore} />
          <Image className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
          <span className="text-[9px] text-muted-foreground group-hover:text-primary mt-0.5 font-medium">Thêm</span>
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

  // Dọn dẹp object URLs khi component unmount để tránh memory leak
  const previewUrlsRef = useRef<string[]>([]);
  previewUrlsRef.current = previewUrls;

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
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (!currentUser.id) {
      toast.error('Bạn cần đăng nhập để đăng ảnh!');
      e.target.value = '';
      return;
    }

    const newFiles = Array.from(files);

    // Tạo preview URL cục bộ từ File object — KHÔNG upload Cloudinary
    const newPreviews = newFiles.map(file => URL.createObjectURL(file));

    setSelectedFiles(prev => [...prev, ...newFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviews]);

    toast.success(`Đã chọn ${newFiles.length} ảnh. Ảnh sẽ được tải lên khi bạn đăng bài.`);
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    // Thu hồi object URL trước khi xóa
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title.trim() || !community) {
      toast.error('Vui lòng điền tiêu đề và chọn chủ đề');
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

      const res = await fetch(`${API_URL}/posts`, {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();

      if (data.status === 'success') {
        toast.success('Đã gửi bài! Hệ thống đang xử lý ảnh và kiểm duyệt ngầm, bài viết sẽ hiện ra sau giây lát.');
        // Dọn dẹp form
        setTitle('');
        setContent('');
        // Thu hồi các object URL tạm
        previewUrls.forEach(url => URL.revokeObjectURL(url));
        setSelectedFiles([]);
        setPreviewUrls([]);
        onPostCreated(data.data);
      } else {
        toast.error('Lỗi máy chủ: ' + data.message);
      }
    } catch (err) {
      toast.error('Không thể kết nối với server!');
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

          {/* Image Upload Section — luôn hiện bên dưới nội dung */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <label className="text-[11px] uppercase tracking-[0.1em] font-bold text-muted-foreground">Hình ảnh đính kèm (Tùy chọn)</label>
              {selectedFiles.length > 0 && (
                <span className="text-[10px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  {selectedFiles.length} ảnh · Sẽ tải lên khi đăng
                </span>
              )}
            </div>
            {/* Nút lớn để thêm ảnh (chỉ hiện khi chưa có ảnh nào) */}
            {previewUrls.length === 0 && (
              <label className="block">
                <div className={`relative flex flex-col items-center justify-center min-h-[120px] rounded-[2rem] border-2 border-dashed transition-all duration-300 cursor-pointer group border-border hover:border-primary/50 hover:bg-primary/5`}>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                  />

                  <div className="flex flex-col items-center p-6">
                    <div className="w-12 h-12 bg-card rounded-2xl shadow-sm border border-border flex items-center justify-center mb-2 group-hover:scale-110 transition-transform">
                      <Image className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm font-bold text-foreground line-clamp-1">Thêm ảnh đính kèm</p>
                    <p className="text-[10px] text-muted-foreground font-medium">Hỗ trợ JPG, PNG, WEBP (Nhiều ảnh)</p>
                  </div>
                </div>
              </label>
            )}

            {/* Thumbnail strip — thu gọn 2 ảnh, click +X để xem thêm */}
            {previewUrls.length > 0 && (
              <ImagePreviewStrip
                previewUrls={previewUrls}
                onRemove={handleRemoveImage}
                onAddMore={handleFileSelect}
              />
            )}
            {previewUrls.length > 0 && (
              <p className="text-[10px] text-muted-foreground font-medium mt-1.5 px-1">
                {previewUrls.length} ảnh · Sẽ tải lên Cloudinary khi bạn nhấn <strong>Đăng</strong>
              </p>
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
                setSelectedFiles([]);
                setPreviewUrls([]);
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
                  {selectedFiles.length > 0 ? `Đang tải ${selectedFiles.length} ảnh...` : 'Đang đăng...'}
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
