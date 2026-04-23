import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';
import { Image as ImageIcon, X, Loader2, Camera } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  currentUser?: { id?: string; _id?: string };
}

const REPORT_REASONS = [
  "Nội dung thù ghét hoặc quấy rối",
  "Nội dung nhạy cảm, người lớn",
  "Spam hoặc lừa đảo",
  "Vi phạm bản quyền",
  "Thông tin sai lệch",
  "Nội dung bạo lực",
  "Khác"
];

export function ReportModal({ isOpen, onOpenChange, postId, currentUser: _currentUser }: ReportModalProps) {
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 3) {
      toast.error("Chỉ được đính kèm tối đa 3 ảnh bằng chứng!");
      return;
    }

    setImages(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    URL.revokeObjectURL(previews[index]);
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) {
      toast.error("Vui lòng chọn lý do báo cáo!");
      return;
    }

    setIsSubmitting(true);
    try {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
      // 1. Upload images if any
      const uploadedUrls: string[] = [];
      for (const file of images) {
        const formData = new FormData();
        formData.append('image', file);
        
        console.log('[ReportModal] Đang upload bằng chứng:', file.name);
        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: authHeaders,
          body: formData,
        });
        const uploadData = await uploadRes.json();
        console.log('[ReportModal] Kết quả upload:', uploadData);
        if (uploadData.status === 'success') {
          uploadedUrls.push(uploadData.data.url);
        } else {
          toast.error(`Upload ảnh thất bại: ${uploadData.message || 'Lỗi không xác định'}`);
          setIsSubmitting(false);
          return;
        }
      }
      console.log('[ReportModal] Tất cả URL bằng chứng:', uploadedUrls);

      // 2. Create Report
      const res = await fetch(`${API_URL}/reports/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({
          post_id: postId,
          reason,
          description,
          evidence_images: uploadedUrls
        }),
      });

      const data = await res.json();
      if (data.status === 'success') {
        toast.success("Cảm ơn bạn! Đã gửi báo cáo cho Admin kiểm duyệt.");
        onOpenChange(false);
        resetForm();
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      toast.error("Lỗi hệ thống khi gửi báo cáo!");
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setReason("");
    setDescription("");
    setImages([]);
    setPreviews([]);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] border-none shadow-2xl overflow-hidden p-0 rounded-2xl">
        <DialogHeader className="bg-muted/30 px-6 py-4 border-b border-border/50">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <span className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
              <Camera className="h-5 w-5 text-red-500" />
            </span>
            Gửi tố cáo bài viết
          </DialogTitle>
          <DialogDescription className="font-medium text-muted-foreground/80">
            Hãy giúp cộng đồng sạch đẹp bằng cách báo cáo các nội dung vi phạm.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="px-6 py-6 space-y-6">
          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
              Lý do báo cáo chính *
            </Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="h-11 rounded-xl border-border bg-background focus:ring-primary/20">
                <SelectValue placeholder="Chọn vấn đề bạn gặp phải..." />
              </SelectTrigger>
              <SelectContent className="rounded-xl border-border">
                {REPORT_REASONS.map(r => (
                  <SelectItem key={r} value={r} className="rounded-lg">{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
              Mô tả chi tiết (không bắt buộc)
            </Label>
            <Textarea
              placeholder="Bạn hãy ghi rõ lý do hoặc nội dung vi phạm để Admin dễ xử lý hơn..."
              className="min-h-[100px] rounded-xl border-border bg-background focus:ring-primary/20 resize-none"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
              Bằng chứng hình ảnh (Tối đa 3 ảnh)
            </Label>
            
            <div className="flex flex-wrap gap-2">
              {previews.map((preview, i) => (
                <div key={i} className="group relative h-20 w-20 rounded-xl overflow-hidden border border-border bg-muted shadow-sm">
                  <img src={preview} alt="Evidence" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute top-1 right-1 h-5 w-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              
              {images.length < 3 && (
                <Label
                  htmlFor="evidence-upload"
                  className="h-20 w-20 rounded-xl border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all"
                >
                  <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
                  <span className="text-[10px] font-bold text-muted-foreground/60">Đính kèm</span>
                  <input
                    id="evidence-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleImageChange}
                  />
                </Label>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="rounded-xl font-bold h-11"
              disabled={isSubmitting}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              className="rounded-xl font-black h-11 px-8 bg-red-600 hover:bg-red-700 shadow-lg shadow-red-500/20"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Đang gửi...
                </>
              ) : (
                "Gửi Báo Cáo"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
