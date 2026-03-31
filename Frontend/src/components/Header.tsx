import { useState, useRef, useEffect } from 'react';
import { Bell, User, Menu, Search, TrendingUp, Settings, LogOut, ChevronRight, CircleHelp, Moon, MessageSquareMore } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Post } from './PostCard';
import { User as UserType } from '@/app/App';
import { getImageUrl } from '@/lib/imageUtils';
import { API_URL } from '@/lib/api';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface HeaderProps {
  onViewChange: (view: string) => void;
  onMenuToggle?: () => void;
  onDesktopMenuToggle?: () => void;
  notificationCount: number;
  isAuthenticated?: boolean;
  currentUser?: UserType;
  onLogout?: () => void;
  allPosts?: Post[];
  onPostClick?: (post: Post) => void;
}

const trendingTags = ['sinh viên', 'học tập', 'chia sẻ', 'giải trí', 'thông tin'];

export function Header({ onViewChange, onMenuToggle, onDesktopMenuToggle, notificationCount, isAuthenticated, currentUser, onLogout, allPosts = [], onPostClick }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [feedbackType, setFeedbackType] = useState('suggestion');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleFeedbackSubmit = async () => {
    if (!feedbackContent.trim()) {
      toast.error('Vui lòng nhập nội dung góp ý');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_URL}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: currentUser?.id,
          content: feedbackContent,
          type: feedbackType
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Cảm ơn bạn đã gửi đóng góp ý kiến!');
        setFeedbackContent('');
        setIsFeedbackOpen(false);
      } else {
        toast.error(data.message || 'Lỗi gửi góp ý');
      }
    } catch (e) {
      toast.error('Lỗi kết nối server');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPosts = searchQuery.trim()
    ? allPosts.filter(
      (post) =>
        post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        post.community.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : [];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-16 bg-primary text-primary-foreground shadow-md">
      <div className="flex h-full items-center gap-4 px-4">
        {/* Left: Menu + Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-primary-foreground hover:bg-white/10"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex text-primary-foreground hover:bg-white/10"
            onClick={onDesktopMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div
            className="flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-80"
            onClick={() => onViewChange('home')}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-background text-primary shadow-sm">
              <span className="text-xl">🔗</span>
            </div>
            <span className="hidden sm:inline text-xl font-bold text-white">Linky</span>
          </div>
        </div>

        {/* Center: Search Bar with Dropdown */}
        <div ref={searchRef} className="flex-1 max-w-xl mx-auto relative">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Tìm kiếm bài viết..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full rounded-full border-white/20 bg-white/15 pl-10 pr-4 text-white placeholder:text-white/60 focus:bg-background focus:text-foreground focus:placeholder:text-muted-foreground focus:border-white h-10 transition-colors"
            />
          </div>

          {isSearchOpen && (
            <div className="absolute top-12 left-0 right-0 bg-card rounded-xl shadow-2xl border border-border max-h-96 overflow-y-auto z-50">
              {searchQuery.trim() === '' ? (
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold text-foreground">Chủ đề phổ biến</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {trendingTags.map((tag) => (
                      <button
                        key={tag}
                        className="px-3 py-1.5 bg-muted hover:bg-muted/80 rounded-full text-sm text-foreground transition-colors"
                        onClick={() => setSearchQuery(tag)}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>
              ) : filteredPosts.length > 0 ? (
                <div className="py-2">
                  {filteredPosts.slice(0, 5).map((post) => (
                    <button
                      key={post.id}
                      className="w-full text-left px-4 py-3 hover:bg-accent transition-colors flex items-start gap-3"
                      onClick={() => {
                        if (onPostClick) onPostClick(post);
                        setIsSearchOpen(false);
                        setSearchQuery('');
                      }}
                    >
                      <Search className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{post.title}</p>
                        <p className="text-xs text-muted-foreground">r/{post.community} • {post.comments.length} bình luận</p>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <p className="text-sm text-muted-foreground">Không tìm thấy kết quả cho "{searchQuery}"</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {isAuthenticated ? (
            <>
              <Button
                variant="ghost"
                className="relative text-primary-foreground hover:bg-white/10 hover:text-white"
                onClick={() => onViewChange('notifications')}
              >
                <Bell className="h-5 w-5" />
                {notificationCount > 0 && (
                  <Badge className="absolute -right-1 -top-1 h-5 min-w-5 bg-white text-primary px-1 hover:bg-white/90">
                    {notificationCount}
                  </Badge>
                )}
                <span className="hidden sm:ml-2 sm:inline">Thông Báo</span>
              </Button>
              <div className="relative" ref={userMenuRef}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-primary-foreground hover:bg-white/10 hover:text-white"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                >
                  {currentUser?.avatar ? (
                    <img src={getImageUrl(currentUser.avatar)} alt="Avatar" className="h-8 w-8 rounded-full border border-white/20" />
                  ) : (
                    <User className="h-5 w-5" />
                  )}
                </Button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 top-12 w-80 bg-card rounded-xl shadow-2xl border border-border py-4 z-50 animate-in fade-in zoom-in duration-200">
                    <div className="px-4 mb-4">
                      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer transition-colors" onClick={() => { onViewChange('profile'); setIsUserMenuOpen(false); }}>
                        <img src={getImageUrl(currentUser?.avatar)} alt="Avatar" className="h-10 w-10 rounded-full border border-border" />
                        <span className="font-bold text-foreground">{currentUser?.name || 'Người dùng'}</span>
                      </div>
                      <div className="mt-2 border-t border-border pt-2">
                         <Button 
                           variant="outline" 
                           className="w-full justify-center gap-2 text-primary border-primary/20 hover:bg-primary/5 h-9 rounded-lg"
                           onClick={() => { onViewChange('profile'); setIsUserMenuOpen(false); }}
                         >
                           <User className="h-4 w-4" />
                           Xem trang cá nhân
                         </Button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      {[
                        { icon: Settings, label: 'Cài đặt và quyền riêng tư', action: () => onViewChange('settings') },
                        { icon: MessageSquareMore, label: 'Đóng góp ý kiến', action: () => setIsFeedbackOpen(true) },
                        { icon: LogOut, label: 'Đăng xuất', action: onLogout, color: 'text-red-500' },
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent transition-colors text-foreground"
                          onClick={() => {
                            if (item.action) item.action();
                            setIsUserMenuOpen(false);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                              <item.icon className={`h-5 w-5 ${item.color || ''}`} />
                            </div>
                            <span className="text-[15px] font-medium">{item.label}</span>
                          </div>
                          {item.icon !== LogOut && <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Button
              className="bg-white text-primary hover:bg-white/90 font-semibold"
              onClick={() => onViewChange('login')}
            >
              Đăng nhập
            </Button>
          )}
        </div>
      </div>
      
      {/* Feedback Modal */}
      <Dialog open={isFeedbackOpen} onOpenChange={setIsFeedbackOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MessageSquareMore className="h-5 w-5 text-primary" />
              Đóng góp ý kiến
            </DialogTitle>
            <DialogDescription>
              Chia sẻ ý kiến hoặc báo cáo lỗi để chúng tôi cải thiện Linky tốt hơn.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="feedback-type">Loại đóng góp</Label>
              <select 
                id="feedback-type"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={feedbackType}
                onChange={(e) => setFeedbackType(e.target.value)}
              >
                <option value="suggestion">Góp ý tính năng</option>
                <option value="bug">Báo lỗi</option>
                <option value="other">Khác</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback-content">Nội dung</Label>
              <Textarea 
                id="feedback-content"
                placeholder="Nhập nội dung đóng góp của bạn tại đây..."
                className="min-h-[120px] rounded-xl focus-visible:ring-primary/20"
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsFeedbackOpen(false)} disabled={isSubmitting}>Hủy</Button>
            <Button onClick={handleFeedbackSubmit} disabled={isSubmitting} className="bg-primary hover:bg-primary/90 rounded-lg px-6">
              {isSubmitting ? 'Đang gửi...' : 'Gửi góp ý'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  );
}