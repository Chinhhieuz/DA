import { useState, useEffect } from 'react';
import { getImageUrl } from '@/lib/imageUtils';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';
import { MessageCircle, MoreHorizontal, Flag, ArrowBigUp, ArrowBigDown, Share2, Trash2, Bookmark, UserPlus, Check, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const prev = () => setCurrent(i => (i - 1 + images.length) % images.length);
  const next = () => setCurrent(i => (i + 1) % images.length);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      if (e.key === 'ArrowRight') next();
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black/95 flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10"
        onClick={onClose}
      >
        <X className="h-6 w-6" />
      </button>

      {/* Counter */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
        {current + 1} / {images.length}
      </div>

      {/* Main image */}
      <div className="relative flex items-center justify-center w-full h-full px-16" onClick={e => e.stopPropagation()}>
        {images.length > 1 && (
          <button
            className="absolute left-4 text-white bg-white/10 hover:bg-white/25 rounded-full p-3 transition-colors"
            onClick={prev}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <img
          src={getImageUrl(images[current])}
          alt={`Ảnh ${current + 1}`}
          className="max-h-[85vh] max-w-full object-contain rounded-lg shadow-2xl"
        />
        {images.length > 1 && (
          <button
            className="absolute right-4 text-white bg-white/10 hover:bg-white/25 rounded-full p-3 transition-colors"
            onClick={next}
          >
            <ChevronRight className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="absolute bottom-4 flex gap-2 overflow-x-auto max-w-[90vw] px-4" onClick={e => e.stopPropagation()}>
          {images.map((img, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                i === current ? 'border-white scale-110' : 'border-white/30 opacity-60 hover:opacity-100'
              }`}
            >
              <img src={getImageUrl(img)} alt={`thumb-${i}`} className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Component collage ảnh — gom tối đa 4 ảnh, click để xem tất cả
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
          const aspectClass = visible.length === 1 ? 'aspect-[16/9]' : 'aspect-square';
          // Ảnh đầu tiên khi có 3 ảnh thì chiếm full width hàng đầu
          const isWide = visible.length === 3 && idx === 0;

          return (
            <div
              key={idx}
              className={`relative group/img overflow-hidden rounded-xl border border-border bg-muted cursor-pointer ${
                aspectClass
              } ${isWide ? 'col-span-2' : ''}`}
              onClick={(e) => openLightbox(e, idx)}
            >
              <img
                src={getImageUrl(url)}
                alt={`${title} - ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
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
}

interface PostCardProps {
  post: Post;
  onPostClick?: (post: Post) => void;
  currentUser?: { id?: string; savedPosts?: string[] };
  onReact?: (postId: string, action: string, type: string) => void;
  onUserClick?: (userId: string) => void;
  onSaveToggle?: (postId: string, isSaved: boolean) => void;
  onCommunityClick?: (community: string) => void;
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
  showAllImages = false
}: PostCardProps) {
  const [upVotes, setUpVotes] = useState(post.upvotes);
  const [downVotes, setDownVotes] = useState(post.downvotes || 0);
  const [userReaction, setUserReaction] = useState<string | null>(post.userVote || null);
  const [isFollowing, setIsFollowing] = useState(post.author.isFollowing || false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

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

  const handleVote = async (type: 'up' | 'down') => {
    if (!currentUser?.id) {
       toast.error('Vui lòng đăng nhập để thao tác!');
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
    const url = `${window.location.origin}${window.location.pathname}?postId=${post.id}`;
    navigator.clipboard.writeText(url)
      .then(() => toast.success('Đã sao chép liên kết vào bộ nhớ tạm!'))
      .catch(() => toast.error('Không thể tự động sao chép liên kết.'));
  };

  const handleDeletePost = async () => {
    if (!currentUser?.id) return;
    if (!window.confirm('Bạn có chắc chắn muốn xóa bài viết này không? Quay lại sẽ không được.')) return;

    try {
      const res = await fetch(`${API_URL}/posts/${post.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: currentUser.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Đã xóa bài viết thành công!');
        // Reload lại trang hoặc cập nhật state ở component cha (App.tsx)
        window.location.reload(); 
      } else {
        toast.error(data.message);
      }
    } catch (err: any) {
      console.error('Lỗi khi xóa bài:', err);
      toast.error(`Lỗi khi xóa bài viết: ${err.message || 'Không rõ nguyên nhân'}`);
    }
  };

  return (
    <Card className="mb-5 overflow-hidden border border-border bg-card rounded-2xl shadow-sm hover:shadow-md transition-all duration-200">
      <div className="p-4 sm:p-5">
        {/* Content Section */}
        <div className="flex-1">
          {/* Post Header */}
          <div className="mb-3 flex items-start gap-3">
            <Avatar 
              className="h-10 w-10 border border-border shadow-sm ring-2 ring-background cursor-pointer hover:opacity-80 transition-opacity"
              onClick={(e) => { e.stopPropagation(); onUserClick && post.author.id && onUserClick(post.author.id); }}
            >
              <AvatarImage src={post.author.avatar} className="object-cover" />
              <AvatarFallback className="bg-muted text-muted-foreground">{post.author.name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span 
                  className="font-bold text-foreground text-[15px] hover:underline cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); onUserClick && post.author.id && onUserClick(post.author.id); }}
                >
                   {post.author.name || post.author.username}
                </span>
                <span className="text-muted-foreground text-xs font-medium">• {post.timestamp}</span>
              </div>
              <div className="mt-0.5">
                <Badge 
                  variant="secondary" 
                  className="bg-red-50 text-red-700 hover:bg-red-100 font-semibold px-2 py-0.5 text-[10px] tracking-wider cursor-pointer transition-colors border border-red-100 uppercase"
                  onClick={(e) => { e.stopPropagation(); onCommunityClick && onCommunityClick(post.community); }}
                >
                  #{post.community.replace(/^[rdD]\//, '')}
                </Badge>
              </div>
            </div>
            
            {/* Follow Button in Post Header */}
            {currentUser?.id && post.author.id && currentUser.id !== post.author.id && (
               <Button 
                variant="ghost" 
                size="sm" 
                className={`ml-auto h-8 px-2 font-bold text-xs gap-1 transition-all ${isFollowing ? 'text-slate-500 hover:bg-slate-100 hover:text-slate-600' : 'text-red-600 hover:bg-red-50 hover:text-red-700'}`}
                onClick={async (e) => {
                  e.stopPropagation();
                  const action = isFollowing ? 'unfollow' : 'follow';
                  const prevIsFollowing = isFollowing;
                  
                  // Optimistic update
                  setIsFollowing(!isFollowing);

                  try {
                    const res = await fetch(`${API_URL}/auth/friends/${action}`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
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
            onClick={() => onPostClick && onPostClick(post)}
          >
            <h3 className="mb-2.5 text-[22px] font-bold leading-snug text-foreground hover:text-primary transition-colors">
              {post.title}
            </h3>
            <p className="mb-4 text-[15px] leading-relaxed text-foreground/90">{post.content}</p>
            {/* Multi-image Rendering — dùng ImageCollage */}
            {post.image_urls && post.image_urls.length > 0 ? (
              <ImageCollage images={post.image_urls} title={post.title} />
            ) : post.image && (
              <img
                src={getImageUrl(post.image)}
                alt={post.title}
                className="mb-3 w-full h-auto rounded-lg bg-muted/50"
              />
            )}
          </div>

          {/* Biểu đồ số liệu Lượt Thích / Bình luận */}
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2 px-1">
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

          <div className="h-[1px] bg-border w-full my-2"></div>

          {/* Post Actions */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-1">
              
            <div className="flex items-center bg-muted rounded-full p-0.5 border border-border gap-1">
              <div className="flex items-center gap-1 group/up">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`rounded-full h-8 w-8 p-0 transition-colors ${userReaction === 'up' || userReaction === '👍' ? 'text-orange-600 bg-orange-50 hover:bg-orange-100' : 'text-muted-foreground hover:text-orange-600 hover:bg-orange-50'}`}
                  onClick={() => handleVote('up')}
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
                  className={`rounded-full h-8 w-8 p-0 transition-colors ${userReaction === 'down' ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'}`}
                  onClick={() => handleVote('down')}
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
                className="gap-2 text-muted-foreground font-medium rounded-full px-4 hover:text-primary hover:bg-primary/10 transition-colors"
                onClick={(e) => { e.stopPropagation(); onPostClick && onPostClick(post); }}
              >
                <MessageCircle className="h-4 w-4" />
                <span>Bình luận</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground font-medium rounded-full px-4 hover:text-green-600 hover:bg-green-50 transition-colors"
                onClick={(e) => { e.stopPropagation(); handleShare(); }}
              >
                <Share2 className="h-4 w-4" />
                <span>Chia sẻ</span>
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground hover:bg-muted">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-card p-2 shadow-lg border border-border">
                <DropdownMenuItem onClick={handleSavePost} className="cursor-pointer gap-3 p-3 text-sm font-medium text-foreground focus:bg-muted focus:text-foreground">
                  <Bookmark className={`h-5 w-5 ${currentUser?.savedPosts?.includes(post.id) ? 'fill-primary text-primary' : 'text-foreground'}`} />
                  <span>{currentUser?.savedPosts?.includes(post.id) ? 'Hủy lưu bài viết' : 'Lưu bài viết'}</span>
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
               className="mt-2 text-sm text-foreground/80 bg-muted p-2 rounded-lg cursor-pointer hover:bg-muted/80 transition-colors"
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
    </Card>
  );
}
export default PostCard;
