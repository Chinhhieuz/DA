import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

import { getImageUrl } from '@/lib/imageUtils';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';
import DOMPurify from 'dompurify';
import { MessageCircle, MoreHorizontal, Flag, ArrowBigUp, ArrowBigDown, Share2, Trash2, Bookmark, UserPlus, Check, X, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReportModal } from './ReportModal';

// Component lightbox xem toàn bộ ảnh
function ImageLightbox({ images, startIndex, onClose }: { images: string[]; startIndex: number; onClose: () => void }) {
  const [current, setCurrent] = useState(startIndex);
  const [isZoomed, setIsZoomed] = useState(false);

  const closeLightbox = useCallback((e?: { stopPropagation?: () => void; preventDefault?: () => void }) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    setIsZoomed(false);
    onClose();
  }, [onClose]);

  const prev = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsZoomed(false);
    setCurrent(i => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const next = useCallback((e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    setIsZoomed(false);
    setCurrent(i => (i + 1) % images.length);
  }, [images.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        prev();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        next();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeLightbox();
      }
    };

    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [closeLightbox, next, prev]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  return createPortal(
    <div className="fixed inset-0 z-[9999] h-[100dvh] w-screen bg-black/98 flex flex-col items-center justify-center backdrop-blur-sm select-none"
      onClick={(e) => {
        closeLightbox(e);
      }}
    >
      <button
        className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full p-2.5 transition-all z-20 hover:scale-110 active:scale-95"
        onClick={(e) => {
          closeLightbox(e);
        }}
      >
        <X className="h-6 w-6" />
      </button>

      <div className="absolute top-6 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full text-white/90 text-sm font-bold tracking-widest pointer-events-none">
        {current + 1} / {images.length}
      </div>

      <div
        className={`relative flex items-center justify-center w-screen h-[100dvh] transition-all duration-300 ${isZoomed ? 'overflow-auto cursor-zoom-out' : 'cursor-zoom-in'}`}
        onClick={(e) => {
          if (!isZoomed) { return; }
          e.stopPropagation();
          setIsZoomed(false);
        }}
      >
        {images.length > 1 && !isZoomed && (
          <button
            className="absolute left-6 text-white bg-white/10 hover:bg-white/25 rounded-full p-4 transition-all z-10 hover:scale-110 active:scale-95"
            onClick={prev}
          >
            <ChevronLeft className="h-8 w-8" />
          </button>
        )}

        <img
          src={getImageUrl(images[current])}
          alt={`Ảnh ${current + 1}`}
          className={`transition-all duration-500 rounded-sm shadow-2xl ${
            isZoomed
              ? 'max-w-none max-h-none w-auto h-auto'
              : 'h-[100dvh] w-screen object-contain'
          }`}
          onClick={(e) => {
            if (isZoomed) {
              e.stopPropagation();
              setIsZoomed(false);
            }
          }}
        />

        {images.length > 1 && !isZoomed && (
          <button
            className="absolute right-6 text-white bg-white/10 hover:bg-white/25 rounded-full p-4 transition-all z-10 hover:scale-110 active:scale-95"
            onClick={next}
          >
            <ChevronRight className="h-8 w-8" />
          </button>
        )}
      </div>

      {images.length > 1 && !isZoomed && (
        <div className="absolute bottom-6 flex gap-3 overflow-x-auto max-w-[90vw] px-6 py-3 bg-white/5 backdrop-blur-md rounded-2xl" onClick={e => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => { setCurrent(i); setIsZoomed(false); }}
              className={`flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 ${
                i === current ? 'border-primary ring-4 ring-primary/20 scale-110' : 'border-white/20 opacity-40 hover:opacity-100 hover:border-white/50'
              }`}
            >
              <img src={getImageUrl(img)} alt={`thumb-${i}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body
  );
}
function ImageCollage({ images, title }: { images: string[]; title: string }) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const MAX_VISIBLE = 4;
  const visible = images.slice(0, MAX_VISIBLE);
  const remaining = images.length - MAX_VISIBLE;

  const openLightbox = (e: React.MouseEvent, idx: number) => {
    e.stopPropagation();
    setLightboxIndex(idx);
  };

  // Layout tùy theo số ảnh
  const getGridClass = () => {
    switch (visible.length) {
      case 1: return 'grid-cols-1';
      case 2: return 'grid-cols-2';
      default: return 'grid-cols-2';
    }
  };

  return (
    <>
      <div className={`grid gap-1.5 mb-3 ${getGridClass()}`}>
        {visible.map((url, idx) => {
          const isLastVisible = idx === visible.length - 1 && remaining > 0;
          const isSingle = visible.length === 1;
          const aspectClass = isSingle ? '' : 'aspect-square';
          // Ảnh đầu tiên khi có 3 ảnh thì chiếm full width hàng đầu
          const isWide = visible.length === 3 && idx === 0;

          return (
            <div
              key={idx}
              className={`relative group/img overflow-hidden rounded-xl border border-border bg-muted cursor-pointer ${
                aspectClass
              } ${isWide ? 'col-span-2' : ''}`}
              style={isSingle ? { maxHeight: '600px' } : {}}
              onClick={(e) => openLightbox(e, idx)}
            >
              <img
                src={getImageUrl(url)}
                alt={`${title} - ${idx + 1}`}
                className={`${isSingle ? 'w-full h-auto max-h-[600px] object-contain' : 'w-full h-full object-cover'} transition-transform duration-500 group-hover/img:scale-105`}
              />
              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/20 transition-colors duration-300" />
              {/* +X overlay trên ảnh cuối */}
              {isLastVisible && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center">
                  <span className="text-white text-3xl font-black drop-shadow-lg">+{remaining}</span>
                  <span className="text-white/80 text-xs mt-1">Xem tất cả</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Lightbox */}
      {lightboxIndex !== null && (
        <ImageLightbox
          images={images}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

export interface Thread {
  id: string;
  author: {
    name: string;
    avatar: string;
    username: string;
    id?: string;
  };
  content: string;
  image?: string;
  timestamp: string;
  upvotes?: number;
  downvotes?: number;
  userVote?: string | null;
}

export interface Comment {
  id: string;
  author: {
    name: string;
    avatar: string;
    username: string;
    id?: string;
  };
  content: string;
  image?: string;
  timestamp: string;
  upvotes: number;
  downvotes: number;
  userVote?: string | null;
  threads?: Thread[];
}

export interface Post {
  id: string;
  author: {
    id?: string;
    name: string;
    avatar: string;
    username: string;
    isFollowing?: boolean;
  };
  community: string;
  timestamp: string;
  title: string;
  content: string;
  image?: string;
  image_urls?: string[];
  video?: string;
  upvotes: number;
  downvotes: number;
  comments: Comment[];
  commentCount?: number;
  recentComment?: {
    authorName: string;
    content: string;
  };
  userVote?: 'up' | 'down' | null;
  saved?: boolean;
  status?: string;
}

interface PostCardProps {
  post: Post;
  onPostClick?: (post: Post) => void;
  currentUser?: { id?: string; savedPosts?: string[]; role?: string };
  onReact?: (postId: string, action: string, type: string) => void;
  onUserClick?: (userId: string) => void;
  onSaveToggle?: (postId: string, isSaved: boolean) => void;
  onCommunityClick?: (community: string) => void;
  onDeleteSuccess?: (postId: string) => void;
  showAllImages?: boolean;
}

 
export function PostCard({ 
  post, 
  onPostClick, 
  currentUser, 
  onReact, 
  onUserClick, 
  onSaveToggle, 
  onCommunityClick,
  onDeleteSuccess,
  showAllImages = false
}: PostCardProps) {
  const [upVotes, setUpVotes] = useState(post.upvotes);
  const [downVotes, setDownVotes] = useState(post.downvotes || 0);
  const [userReaction, setUserReaction] = useState<string | null>(post.userVote || null);
  const [isFollowing, setIsFollowing] = useState(post.author.isFollowing || false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [inlineContentImage, setInlineContentImage] = useState<string | null>(null);

  useEffect(() => {
    setUpVotes(post.upvotes);
    setDownVotes(post.downvotes || 0);
    setUserReaction(post.userVote || null);
    setIsFollowing(post.author.isFollowing || false);
  }, [post.upvotes, post.downvotes, post.userVote, post.author.isFollowing]);

  const handleReportAction = () => {
    if (!currentUser?.id) {
       toast.error('Vui lòng đăng nhập để báo cáo nội dung!');
       return;
    }
    setIsReportModalOpen(true);
  };

  const handleSavePost = async () => {
    if (!currentUser?.id) {
       toast.error('Vui lòng đăng nhập để lưu bài viết!');
       return;
    }
    try {
      const res = await fetch(`${API_URL}/posts/${post.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(data.message);
        if (onSaveToggle) {
          onSaveToggle(post.id, data.isSaved);
        }
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      console.error('Lỗi khi lưu bài:', err);
      toast.error(`Lỗi khi lưu bài viết: ${err.message || 'Không rõ nguyên nhân'}`);
    }
  };

  const handleVote = async (e: React.MouseEvent, type: 'up' | 'down') => {
    e.stopPropagation();
    if (!currentUser?.id) {
      toast.error('Vui lòng đăng nhập để bình chọn!');
      return;
    }
    if (post.status !== 'approved') {
      toast.error('Bài viết này đã bị khóa!');
      return;
    }

    const isRemoving = userReaction === type || (type === 'up' && userReaction === '👍');
    const action = type === 'up' 
      ? (isRemoving ? 'unlike' : 'up') 
      : (isRemoving ? 'undislike' : 'down');

    const previousUp = upVotes;
    const previousDown = downVotes;
    const previousReaction = userReaction;

    // Optimistic Update
    if (type === 'up') {
      if (isRemoving) setUpVotes(Math.max(0, upVotes - 1));
      else {
        setUpVotes(upVotes + 1);
        if (userReaction === 'down') setDownVotes(Math.max(0, downVotes - 1));
      }
    } else {
      if (isRemoving) setDownVotes(Math.max(0, downVotes - 1));
      else {
        setDownVotes(downVotes + 1);
        if (userReaction === 'up' || userReaction === '👍') setUpVotes(Math.max(0, upVotes - 1));
      }
    }
    
    setUserReaction(isRemoving ? null : type);

    try {
       const res = await fetch(`${API_URL}/posts/${post.id}/react`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ action, user_id: currentUser.id, type })
       });
       
       const data = await res.json();
       if (!res.ok || data.status !== 'success') {
          throw new Error(data.message || 'Lỗi không xác định từ server');
       }

       if (onReact) onReact(post.id, action, type);
    } catch (e: any) { 
      console.error('Lỗi lưu vote:', e);
      toast.error('Không thể lưu lượt bình chọn. Vui lòng thử lại!');
      // Revert state
      setUpVotes(previousUp);
      setDownVotes(previousDown);
      setUserReaction(previousReaction);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?view=post&id=${post.id}`);
    toast.success('Đã sao chép liên kết vào clipboard');
  };

  const handleDeletePost = async () => {
    // Trì hoãn một chút để Dropdown Menu đóng lại hoàn toàn
    setTimeout(async () => {
      if (!currentUser?.id) {
        toast.error('Lỗi: Bạn cần đăng nhập để xóa bài viết này.');
        return;
      }

      if (!post.id) {
         toast.error('Lỗi kỹ thuật: Không tìm thấy ID bài viết.');
         return;
      }

      if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không? Quay lại sẽ không được.')) return;

      try {
        const deleteUrl = `${API_URL}/posts/${post.id}?user_id=${currentUser.id}`;
        const res = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        });
        
        const data = await res.json();
        if (data.status === 'success') {
          toast.success('Đã xóa bài viết thành công!');
          if (onDeleteSuccess) {
            onDeleteSuccess(post.id);
          } else {
             // Dự phòng nếu không có callback
             window.location.reload(); 
          }
        } else {
          toast.error(data.message);
        }
      } catch (err: any) {
        console.error('Lỗi khi xóa bài:', err);
        toast.error(`Lỗi mạng khi xóa bài viết: ${err.message}`);
      }
    }, 100);
  };

  const handlePostContentClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null;
    if (!target) {
      onPostClick && onPostClick(post);
      return;
    }

    const clickedImage = target.closest('img');
    if (clickedImage) {
      e.preventDefault();
      e.stopPropagation();

      // Use resolved browser URL first to avoid malformed paths from raw attributes.
      const htmlImage = clickedImage as HTMLImageElement;
      const imageSrc = htmlImage.currentSrc || htmlImage.src || htmlImage.getAttribute('src') || '';
      if (imageSrc) {
        setInlineContentImage(imageSrc);
      }
      return;
    }

    onPostClick && onPostClick(post);
  };

  return (
    <Card className="glass-panel group mb-4 overflow-hidden rounded-[28px] border border-border/70 shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_30px_70px_rgba(15,23,42,0.12)]">
      <div className="p-4 sm:p-5">
        {/* Content Section */}
        <div className="flex-1">
          {/* Post Header */}
          <div className="mb-3 flex items-start gap-3">
            <Avatar 
              className="h-11 w-11 cursor-pointer border-2 border-background shadow-md ring-2 ring-primary/20 dark:ring-primary/40 transition-opacity hover:opacity-80"
              onClick={(e) => { e.stopPropagation(); onUserClick && post.author.id && onUserClick(post.author.id); }}
            >
              <AvatarImage src={post.author.avatar} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground">{post.author.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span 
                  className="font-bold text-foreground text-[14px] hover:underline cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onUserClick && post.author.id && onUserClick(post.author.id); }}
                >
                   {post.author.name || post.author.username}
                </span>
                <span className="text-muted-foreground text-[11px] font-medium">• {post.timestamp}</span>
              </div>
              <div className="mt-0.5 flex flex-wrap gap-1">
                <Badge 
                  variant="secondary" 
                  className="flex cursor-pointer items-center gap-1 border-none bg-primary/10 px-3 py-1 font-semibold text-primary hover:bg-primary/20"
                  onClick={(e) => { e.stopPropagation(); onCommunityClick && onCommunityClick(post.community); }}
                >
                  {post.community}
                </Badge>
                
                {/* Status Badge - Only for non-approved posts */}
                {post.status !== 'approved' && (
                   <Badge 
                     variant="outline" 
                     className={`text-[9px] px-1.5 py-0 font-bold uppercase ${
                       post.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                       post.status === 'rejected' ? 'bg-red-50 text-red-600 border-red-200' :
                       post.status === 'hidden' ? 'bg-slate-50 text-slate-500 border-slate-200' :
                       'bg-green-50 text-green-600 border-green-200'
                     }`}
                   >
                     {post.status === 'pending' ? 'Chờ duyệt' : 
                      post.status === 'rejected' ? 'Bị từ chối' : 
                      post.status === 'hidden' ? 'Bị ẩn' : 
                      'Đã đăng'}
                   </Badge>
                )}
              </div>
            </div>
            
            {/* Follow Button in Post Header */}
            {currentUser?.id && post.author.id && currentUser.id !== post.author.id && (
               <Button 
                variant="ghost" 
                size="sm" 
                className={`ml-auto h-9 gap-1 rounded-full px-3 text-xs font-bold transition-all ${isFollowing ? 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600' : 'bg-primary/8 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-700'}`}
                onClick={async (e) => {
                  e.stopPropagation();
                  const action = isFollowing ? 'unfollow' : 'follow';
                  const prevIsFollowing = isFollowing;
                  
                  // Optimistic update
                  setIsFollowing(!isFollowing);

                   try {
                    const token = localStorage.getItem('token');
                    const res = await fetch(`${API_URL}/auth/friends/${action}`, {
                      method: 'POST',
                      headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {})
                      },
                      body: JSON.stringify({ followerId: currentUser.id, targetId: post.author.id })
                    });
                    if (res.ok) {
                      toast.success(`${!prevIsFollowing ? 'Đã theo dõi' : 'Đã bỏ theo dõi'} ${post.author.name || post.author.username}`);
                    } else {
                      const data = await res.json();
                      toast.error(data.message || 'Lỗi khi thực hiện thao tác');
                      setIsFollowing(prevIsFollowing);
                    }
                  } catch (err) {
                    toast.error('Lỗi kết nối máy chủ');
                    setIsFollowing(prevIsFollowing);
                  }
                }}
               >
                 {isFollowing ? <Check className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
                 {isFollowing ? 'Đã theo dõi' : 'Theo dõi'}
               </Button>
            )}
          </div>

          {/* Post Content */}
          <div
            className="cursor-pointer"
            onClick={handlePostContentClick}
          >
            <h3 className="mb-2 text-[20px] font-black leading-snug tracking-tight text-foreground transition-colors group-hover:text-primary sm:text-[24px]">
              {post.title}
            </h3>
            <div 
              className="tiptap-prose mb-4 text-[14px] leading-7 text-foreground/85"
              dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content) }}
            />
            {/* Multi-image Rendering - dùng ImageCollage */}
            {post.video && (
              <div className="mb-3" onClick={(e) => e.stopPropagation()}>
                <video src={post.video} controls className="w-full rounded-xl bg-black max-h-[520px]" />
              </div>
            )}
            {post.image_urls && post.image_urls.length > 0 ? (
              <ImageCollage images={post.image_urls} title={post.title} />
            ) : post.image ? (
              <ImageCollage images={[post.image]} title={post.title} />
            ) : null}
          </div>

          {/* Biểu đồ số liệu Lượt Thích / Bình luận */}
          <div className="mb-3 flex items-center justify-between px-1 text-xs text-muted-foreground">
              <div className="flex gap-2 items-center">
                {upVotes > 0 && (
                   <span className="flex items-center gap-0.5 rounded-full px-2 py-0.5 bg-orange-50/10 text-orange-600 font-bold border border-orange-100/20 italic">
                     <ArrowBigUp className="h-3 w-3 fill-orange-600" /> {upVotes}
                   </span>
                )}
                {downVotes > 0 && (
                   <span className="flex items-center gap-0.5 rounded-full px-2 py-0.5 bg-blue-50/10 text-blue-600 font-bold border border-blue-100/20 italic">
                     <ArrowBigDown className="h-3 w-3 fill-blue-600" /> {downVotes}
                   </span>
                )}
              </div>
             <div>
                {(post.commentCount && post.commentCount > 0) || (post.comments && post.comments.length > 0) ? (
                   <span className="cursor-pointer hover:underline" onClick={() => onPostClick && onPostClick(post)}>
                       {Math.max(post.commentCount || 0, post.comments?.length || 0)} Bình luận
                   </span>
                ) : null}
             </div>
          </div>

          <div className="my-3 h-px w-full bg-border/80"></div>

          {/* Post Actions */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex flex-wrap items-center gap-2">
              
            <div className="flex items-center gap-1 rounded-full border border-border/80 bg-muted/40 backdrop-blur-md p-0.5">
              <div className="flex items-center gap-1 group/up">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-full h-8 w-8 p-0 transition-all ${userReaction === 'up' || userReaction === '👍' ? 'text-orange-600 bg-orange-500/15 hover:bg-orange-500/25' : 'text-muted-foreground hover:text-orange-600 hover:bg-orange-500/10'}`}
                  onClick={(e) => handleVote(e, 'up')}
                >
                  <ArrowBigUp className={`h-5 w-5 ${userReaction === 'up' || userReaction === '👍' ? 'fill-orange-600' : ''}`} />
                </Button>
                <span className={`text-sm font-bold min-w-[12px] ${userReaction === 'up' || userReaction === '👍' ? 'text-orange-600' : 'text-muted-foreground'}`}>
                  {upVotes}
                </span>
              </div>
              
              <div className="w-[1px] h-4 bg-border mx-0.5"></div>

              <div className="flex items-center gap-1 group/down">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-full h-8 w-8 p-0 transition-all ${userReaction === 'down' ? 'text-blue-600 bg-blue-500/15 hover:bg-blue-500/25' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-500/10'}`}
                  onClick={(e) => handleVote(e, 'down')}
                >
                  <ArrowBigDown className={`h-5 w-5 ${userReaction === 'down' ? 'fill-blue-600' : ''}`} />
                </Button>
                <span className={`text-sm font-bold min-w-[12px] ${userReaction === 'down' ? 'text-blue-600' : 'text-muted-foreground'}`}>
                  {downVotes}
                </span>
              </div>
            </div>

              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-4 font-medium text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                onClick={(e) => { e.stopPropagation(); onPostClick && onPostClick(post); }}
              >
                <MessageCircle className="h-4 w-4" />
                <span>Bình luận</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-4 font-medium text-muted-foreground transition-colors hover:bg-green-50 dark:hover:bg-green-900/10 hover:text-green-600"
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
              >
                <Share2 className="h-4 w-4" />
                <span>Chia sẻ</span>
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:bg-muted">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-panel w-64 p-2">
                <DropdownMenuItem onClick={handleSavePost} className="cursor-pointer gap-3 p-3 text-sm font-medium text-foreground focus:bg-muted focus:text-foreground">
                  <Bookmark className={`h-5 w-5 ${currentUser?.savedPosts?.includes(post.id) ? 'fill-primary text-primary' : 'text-foreground'}`} />
                  <span>{currentUser?.savedPosts?.includes(post.id) ? 'Hủy đã lưu' : 'Lưu bài viết'}</span>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={handleReportAction} className="cursor-pointer gap-3 p-3 text-sm font-medium focus:bg-muted text-red-600 focus:text-red-700">
                  <Flag className="h-5 w-5 text-red-600" />
                  <span>Báo cáo bài viết</span>
                </DropdownMenuItem>

                {currentUser?.id === post.author.id && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleDeletePost} className="cursor-pointer gap-3 p-3 text-sm font-medium focus:bg-red-50 text-red-600 focus:text-red-700">
                      <Trash2 className="h-5 w-5" />
                      <span>Xóa bài viết</span>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Recent Comment Preview */}
          {post.recentComment && (
             <div 
               className="mt-3 cursor-pointer rounded-2xl bg-muted/70 p-3 text-sm text-foreground/80 transition-colors hover:bg-muted"
               onClick={() => onPostClick && onPostClick(post)}
             >
               <span className="font-semibold text-foreground">{post.recentComment.authorName}</span>: {post.recentComment.content}
             </div>
          )}

        </div>
      </div>
      {/* Report Modal */}
      <ReportModal 
        isOpen={isReportModalOpen} 
        onOpenChange={setIsReportModalOpen} 
        postId={post.id} 
        currentUser={currentUser} 
      />
      {inlineContentImage && (
        <ImageLightbox
          images={[inlineContentImage]}
          startIndex={0}
          onClose={() => setInlineContentImage(null)}
        />
      )}
    </Card>
  );
}
export default PostCard;