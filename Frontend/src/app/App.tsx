import { useState, useEffect, useCallback, useRef } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header'
import { Sidebar } from '@/components/Sidebar'
import { PostCard, Post, Comment } from '@/components/PostCard'
import { PostDetail } from '@/components/PostDetail'
import { CreatePost } from '@/components/CreatePost'
import { Profile } from '@/components/Profile'
import { Messages } from '@/components/Messages'
import { Notifications } from '@/components/Notifications'
import { Settings } from '@/components/Settings'
import { SearchView } from '@/components/SearchView'
import { TrendingContent } from '@/components/TrendingContent'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Toaster } from '@/components/ui/sonner'
import { Login } from '@/components/Login'
import { Badge } from '@/components/ui/badge'
import { AdminDashboard } from '@/components/AdminDashboard'
import { ResetPassword } from '@/components/ResetPassword'
import { SavedPosts } from '@/components/SavedPosts'
import { getImageUrl } from '@/lib/imageUtils'
import { API_URL } from '@/lib/api'
import { SocketProvider, useSocket } from "@/contexts/SocketContext";

import '../index.css'

const initialPosts: Post[] = [];

const normalizeEntityId = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);

  if (typeof value === 'object') {
    if (typeof value.$oid === 'string') return value.$oid.trim();
    if (value._id !== undefined && value._id !== value) {
      const nested = normalizeEntityId(value._id);
      if (nested) return nested;
    }
    if (typeof value.id === 'string' || typeof value.id === 'number') {
      const direct = String(value.id).trim();
      if (direct) return direct;
    }
    if (typeof value.toHexString === 'function') {
      const hex = value.toHexString();
      if (typeof hex === 'string' && hex.trim()) return hex.trim();
    }
    if (typeof value.toString === 'function') {
      const str = value.toString().trim();
      if (str && str !== '[object Object]') return str;
    }
  }

  return '';
};

const sanitizeEntityId = (value: any): string => {
  const normalized = normalizeEntityId(value);
  if (!normalized) return '';

  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null' || normalized === '[object Object]') {
    return '';
  }

  return normalized;
};

export interface User {
  id?: string;
  _id?: string;
  name: string;
  avatar: string;
  username: string;
  role: 'user' | 'moderator' | 'admin';
  bio?: string;
  location?: string;
  website?: string;
  preferences?: {
    darkMode: boolean;
    pushNotifications: boolean;
    commentNotifications: boolean;
  };
  savedPosts?: string[];
}

const defaultUser: User = {
  id: '',
  name: 'Admin User',
  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100',
  username: 'admin',
  role: 'admin',
  preferences: { darkMode: false, pushNotifications: true, commentNotifications: true },
  savedPosts: []
};

// --- AppContent Component (Needs to be inside SocketProvider) ---
interface AppContentProps {
  currentUser: User;
  setCurrentUser: React.Dispatch<React.SetStateAction<User>>;
  isAuthenticated: boolean;
  setIsAuthenticated: React.Dispatch<React.SetStateAction<boolean>>;
  unreadNotifications: number;
  setUnreadNotifications: React.Dispatch<React.SetStateAction<number>>;
  unreadMessagesCount: number;
  setUnreadMessagesCount: React.Dispatch<React.SetStateAction<number>>;
  activeCommunity: string | null;
  setActiveCommunity: React.Dispatch<React.SetStateAction<string | null>>;
  feedFilter: 'all' | 'following';
  setFeedFilter: React.Dispatch<React.SetStateAction<'all' | 'following'>>;
  posts: Post[];
  setPosts: React.Dispatch<React.SetStateAction<Post[]>>;
  handleLogout: () => void;
  fetchPosts: (userId?: string, comm?: string | null, filter?: string) => Promise<void>;
  fetchUnreadMessagesCount: (userId: string) => Promise<void>;
  fetchUnreadCount: (userId: string) => Promise<void>;
}

function AppContent({
  currentUser,
  setCurrentUser,
  isAuthenticated,
  setIsAuthenticated,
  unreadNotifications,
  setUnreadNotifications,
  unreadMessagesCount,
  setUnreadMessagesCount,
  activeCommunity,
  setActiveCommunity,
  feedFilter,
  setFeedFilter,
  posts,
  setPosts,
  handleLogout,
  fetchPosts,
  fetchUnreadMessagesCount,
  fetchUnreadCount
}: AppContentProps) {
  const { socket, isConnected } = useSocket();
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [viewedUserIdState, setViewedUserIdState] = useState<string | null>(() => {
    const savedViewedUserId = localStorage.getItem('viewedUserId');
    const normalizedSavedViewedUserId = sanitizeEntityId(savedViewedUserId);
    return normalizedSavedViewedUserId || null;
  });
  const [initialPostId, setInitialPostId] = useState<string | null>(null);
  
  // Use a ref for userId to ensure listeners always have current ID without re-attaching
  const userIdRef = useRef<string>('');
  useEffect(() => {
    userIdRef.current = normalizeEntityId(currentUser.id || currentUser._id);
  }, [currentUser]);

  const pathParts = location.pathname.substring(1).split('/');
  const currentView = pathParts[0] || 'home';
  const rawUrlUserId = currentView === 'profile' && pathParts[1] ? decodeURIComponent(pathParts[1]) : null;
  const urlUserId = sanitizeEntityId(rawUrlUserId);
  const viewedUserId = urlUserId || viewedUserIdState;

  // Global socket listeners
  useEffect(() => {
    if (socket && isConnected) {
      console.log('📡 [App] Attaching global socket listeners');
      
      const handleNewNotification = (data: any) => {
        setUnreadNotifications(prev => prev + 1);
        if ('Notification' in window && Notification.permission === 'granted') {
           // We use a small delay or check current state to ensure valid push
           const currentPrefs = currentUser?.preferences; 
           let shouldNotify = false;
           if (data.type === 'like' && currentPrefs?.pushNotifications !== false) shouldNotify = true;
           if (data.type === 'comment' && currentPrefs?.commentNotifications !== false) shouldNotify = true;
           if (data.type === 'mention') shouldNotify = true;
           if (data.type === 'friend_request') shouldNotify = true;
           if (data.type === 'system') shouldNotify = true;

           if (shouldNotify) {
             const titleMap: Record<string, string> = {
               friend_request: 'Lời mời kết bạn',
               like: 'Thích bài viết',
               comment: 'Bình luận mới',
               mention: 'Bạn được nhắc tên',
               system: 'Thông báo hệ thống'
             };
             const title = titleMap[data.type] || 'Thông báo mới';
             const body = data.type === 'friend_request'
                ? `${data.senderName} đã gửi lời mời kết bạn`
                : (data.type === 'system' ? data.content : data.senderName + ' đã tương tác với bạn');

             new window.Notification(title, { body });
           }
        }
      };

      const handleReceiveMessage = (message: any) => {
          const currentId = userIdRef.current;
          const recipientId = normalizeEntityId(message.recipient);
          const senderId = normalizeEntityId(message.sender);
          const isIncomingForCurrentUser = recipientId === currentId && senderId !== currentId;
          console.log('📩 [App] Global message received:', {
            id: message._id,
            conv: message.conversation?._id || message.conversation,
            sender: senderId,
            recipient: recipientId,
            isIncomingForCurrentUser
          });
          
          if (currentId && recipientId === currentId) {
             const isMessagesPageRoute = window.location.pathname === '/messages' || window.location.pathname.startsWith('/messages/');
             if (!isMessagesPageRoute && isIncomingForCurrentUser) {
               setUnreadMessagesCount(prev => prev + 1);
             }
             console.log('🔄 [App] Refreshing unread counts for:', currentId);
             fetchUnreadMessagesCount(currentId);
          }
          
          const isMessagesPage = window.location.pathname === '/messages' || window.location.pathname.startsWith('/messages/');
          if (!isMessagesPage && isIncomingForCurrentUser) {
            console.log('📣 [App] Triggering toast notification');
            toast('Tin nhắn mới', {
              description: message.content || '[Hình ảnh]',
              action: {
                label: 'Xem',
                onClick: () => navigate('/messages')
              }
            });
          } else {
            console.log('ℹ️ [App] Skipping toast (on messages page)');
          }
      };

      socket.on('new_notification', handleNewNotification);
      socket.on('receive_message', handleReceiveMessage);
      socket.on('notification_cancelled', () => {
        setUnreadNotifications(prev => Math.max(0, prev - 1));
      });

      return () => {
        console.log('📡 [App] Detaching global socket listeners');
        socket.off('new_notification', handleNewNotification);
        socket.off('receive_message', handleReceiveMessage);
        socket.off('notification_cancelled');
      };
    }
  }, [socket, isConnected, fetchUnreadMessagesCount]);

  const handleUserClick = (userId: string) => {
    const normalizedUserId = sanitizeEntityId(userId);
    if (!normalizedUserId) {
      toast.error('Khong tim thay ID nguoi dung');
      return;
    }

    const normalizedCurrentUserId = sanitizeEntityId(currentUser.id || currentUser._id);
    if (normalizedUserId === normalizedCurrentUserId) {
      setViewedUserIdState(null);
      navigate('/profile');
      localStorage.removeItem('viewedUserId');
    } else {
      setViewedUserIdState(normalizedUserId);
      navigate(`/profile/${encodeURIComponent(normalizedUserId)}`);
      localStorage.setItem('viewedUserId', normalizedUserId);
    }
    setSelectedPost(null);
  };

  const handleViewChange = (view: string) => {
    const normalizedView = String(view || '').trim().replace(/^\/+/, '');
    const [baseView] = normalizedView.split('?');
    const targetView = baseView || 'home';

    const protectedViews = ['profile', 'create', 'messages', 'settings', 'notifications', 'groups', 'admin', 'saved'];
    if (!isAuthenticated && protectedViews.includes(targetView)) {
      navigate('/login');
      setMobileMenuOpen(false);
      return;
    }

    fetchPosts(currentUser.id || currentUser._id);
    if (targetView === 'profile') {
      setViewedUserIdState(null);
      localStorage.removeItem('viewedUserId');
    }
    if (targetView === 'home') setActiveCommunity(null);
    
    navigate(targetView === 'home' ? '/' : `/${normalizedView || targetView}`);
    setSelectedPost(null);
    setMobileMenuOpen(false);
    if (targetView === 'notifications') setUnreadNotifications(0);
    if (targetView === 'messages') fetchUnreadMessagesCount(currentUser.id || String((currentUser as any)._id));
  };

  const handlePostClick = (post: Post) => setSelectedPost(post);

  const handleNotificationClick = async (notif: any) => {
    if (notif.type === 'follow' || notif.type === 'friend_request') {
      const senderId = sanitizeEntityId(notif.sender?._id || notif.sender?.id || notif.sender);
      if (senderId) handleUserClick(senderId);
      return;
    }

    let postId = '';
    if (notif.post) {
      postId = typeof notif.post === 'object' ? (notif.post._id || notif.post).toString() : notif.post.toString();
    }
    
    if (postId && (postId.length === 24 || postId.length === 12)) {
      try {
        const res = await fetch(`${API_URL}/posts/${postId}${currentUser.id ? `?userId=${currentUser.id}` : ''}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success') setSelectedPost(data.data);
        }
      } catch (err) {
        console.error('Error fetching post for notification:', err);
      }
    }
  };

  const handleCommunityClick = (comm: string) => {
    setActiveCommunity(comm);
    navigate('/');
    setSelectedPost(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostCreated = () => {
    fetchPosts(currentUser.id || currentUser._id);
    navigate('/');
  };

  const handlePostCommented = (postId: string, newComment: Comment) => {
    setPosts(prev => prev.map(post => post.id === postId ? { 
      ...post, 
      comments: [newComment, ...(post.comments || [])],
      commentCount: (post.commentCount || 0) + 1 
    } : post));
    
    if (selectedPost?.id === postId) {
      setSelectedPost({ 
        ...selectedPost, 
        comments: [newComment, ...(selectedPost.comments || [])],
        commentCount: (selectedPost.commentCount || 0) + 1
      });
    }
  };

  const handleSaveToggle = (postId: string, isSaved: boolean) => {
    const updatedSavedPosts = isSaved 
      ? [...(currentUser.savedPosts || []), postId]
      : (currentUser.savedPosts || []).filter(id => id !== postId);
      
    const updatedUser = { ...currentUser, savedPosts: updatedSavedPosts };
    setCurrentUser(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (selectedPost?.id === postId) setSelectedPost(null);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        return (
          <div className="space-y-6">
            <section className="glass-panel soft-ring overflow-hidden rounded-[28px]">
              <div className="relative px-5 py-5 sm:px-7 sm:py-7">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(201,31,40,0.12),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(18,59,116,0.12),transparent_34%)]" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div className="max-w-2xl">
                    <div className="page-soft-surface mb-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.24em] text-primary">
                      Bang tin Linky
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">
                      Không gian thảo luận gọn gàng, dễ đọc và nổi bật nội dung quan trọng.
                    </h1>
                    <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
                      Theo dõi các bài viết mới, chuyển nhanh giữa chế độ khám phá và nội dung từ những người bạn quan tâm.
                    </p>
                  </div>
                  <div className="page-soft-surface flex items-center gap-2 rounded-2xl p-1.5 shadow-sm">
                    <Button 
                      variant={feedFilter === 'all' ? 'default' : 'ghost'} 
                      size="sm" 
                      onClick={() => setFeedFilter('all')}
                      className={`rounded-xl px-6 h-10 font-bold transition-all ${feedFilter === 'all' ? 'shadow-md shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Khám phá
                    </Button>
                    <Button 
                      variant={feedFilter === 'following' ? 'default' : 'ghost'} 
                      size="sm" 
                      onClick={() => isAuthenticated ? setFeedFilter('following') : toast.error('Vui lòng đăng nhập')}
                      className={`rounded-xl px-6 h-10 font-bold transition-all ${feedFilter === 'following' ? 'shadow-md shadow-primary/20' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      Đang theo dõi
                    </Button>
                  </div>
                </div>
              </div>
            </section>
            {activeCommunity && (
              <div className="glass-panel mb-6 flex items-center justify-between rounded-[24px] p-5">
                <div className="flex items-center gap-4">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary"><Filter className="h-5 w-5" /></div>
                  <div>
                    <h2 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Bộ lọc đang hoạt động</h2>
                    <span className="text-xl font-bold">{activeCommunity}</span>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => setActiveCommunity(null)} className="rounded-xl"><X className="h-3.5 w-3.5 mr-2" /> Xóa</Button>
              </div>
            )}
            <div className="space-y-5">
              {posts.map(post => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onPostClick={handlePostClick} 
                  currentUser={currentUser}
                  onUserClick={handleUserClick}
                  onSaveToggle={handleSaveToggle}
                  onCommunityClick={handleCommunityClick}
                  onDeleteSuccess={handlePostDeleted}
                />
              ))}
            </div>
          </div>
        );
      case 'search': return <SearchView onPostClick={handlePostClick} onUserClick={handleUserClick} currentUser={currentUser} />;
      case 'profile': return <Profile currentUser={currentUser} viewedUserId={viewedUserId} onPostClick={handlePostClick} onAvatarChange={(url) => setCurrentUser({...currentUser, avatar: url})} onProfileUpdate={(data) => setCurrentUser({...currentUser, ...data})} onPostsChanged={() => fetchPosts(currentUser.id)} onUserClick={handleUserClick} onViewChange={handleViewChange} />;
      case 'create': return <CreatePost onPostCreated={handlePostCreated} currentUser={currentUser} />;
      case 'messages': return <Messages currentUser={currentUser} onUserClick={handleUserClick} onMessagesRead={() => fetchUnreadMessagesCount(currentUser.id || currentUser._id || '')} />;
      case 'notifications': return <Notifications currentUser={currentUser} onMarkAllAsRead={() => setUnreadNotifications(0)} onNotificationClick={handleNotificationClick} />;
      case 'settings': return <Settings currentUser={currentUser} onUpdatePreferences={(prefs) => { const u = {...currentUser, preferences: prefs}; setCurrentUser(u); localStorage.setItem('currentUser', JSON.stringify(u)); }} onLogout={handleLogout} />;
      case 'admin': return <AdminDashboard currentUser={currentUser} />;
      case 'saved': return <SavedPosts currentUser={currentUser} onPostClick={handlePostClick} onUserClick={handleUserClick} onSaveToggle={handleSaveToggle} onCommunityClick={handleCommunityClick} onBackHome={() => handleViewChange('home')} />;
      default: return null;
    }
  };

  if (currentView === 'login') {
    return (
      <Login 
        onLogin={(userData: any) => { 
          setIsAuthenticated(true); 
          if (userData?.user) {
            const u = userData.user;
            const newUser: User = {
              ...currentUser,
              id: u._id || u.id,
              name: u.full_name || u.username,
              username: u.username,
              avatar: getImageUrl(u.avatar_url) || defaultUser.avatar,
              role: (u.role || 'user').toLowerCase() as any,
              preferences: u.preferences || defaultUser.preferences,
              savedPosts: u.savedPosts || []
            };
            setCurrentUser(newUser);
            const token = userData.token || u.token;
            localStorage.setItem('currentUser', JSON.stringify(newUser));
            localStorage.setItem('token', token);
            navigate(u.role?.toLowerCase() === 'admin' ? '/admin' : '/');
            fetchUnreadCount(u._id || u.id);
            fetchUnreadMessagesCount(u._id || u.id);
          }
        }} 
        onBackToHome={() => navigate('/')}
      />
    );
  }

  return (
    <div className="app-shell min-h-screen bg-background text-foreground">
      <Header
        onViewChange={handleViewChange}
        onMenuToggle={() => setMobileMenuOpen(true)}
        onDesktopMenuToggle={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
        notificationCount={unreadNotifications}
        unreadMessagesCount={unreadMessagesCount}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onLogout={handleLogout}
        allPosts={posts}
        onPostClick={handlePostClick}
        onCommunityClick={handleCommunityClick}
      />

      <div className={`hidden md:block fixed left-0 top-20 bottom-6 z-40 transition-all duration-300 ${desktopSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
        <div className="h-full w-72">
          <Sidebar currentView={currentView} onViewChange={handleViewChange} userRole={currentUser.role} unreadMessagesCount={unreadMessagesCount} />
        </div>
      </div>

      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-60 bg-background p-0">
          <div className="p-4">
            <Sidebar currentView={currentView} onViewChange={handleViewChange} userRole={currentUser.role} unreadMessagesCount={unreadMessagesCount} />
          </div>
        </SheetContent>
      </Sheet>

      <main className={`relative z-10 ml-0 pt-20 transition-all duration-300 ${desktopSidebarOpen ? 'md:ml-72' : 'md:ml-0'}`}>
        <div className="mx-auto max-w-[1500px] px-4 pb-8 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-8 xl:gap-10">
            <div className="flex-1 max-w-4xl w-full">{renderContent()}</div>
            {currentView === 'home' && (
              <div className="hidden lg:block w-80 pt-1 sticky top-[100px] self-start">
                <TrendingContent onPostClick={handlePostClick} currentUser={currentUser} />
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={!!selectedPost} onOpenChange={(open) => { if (!open) setSelectedPost(null); }}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden">
          <div className="sticky top-0 z-10 flex items-center justify-center p-4 border-b bg-background/95">
            <DialogTitle className="text-lg font-bold">
              {selectedPost ? `Bài viết của ${selectedPost.author.name || selectedPost.author.username}` : 'Chi tiết bài viết'}
            </DialogTitle>
          </div>
          <div className="flex-1 overflow-hidden">
            {selectedPost && (
              <PostDetail
                post={selectedPost}
                onBack={() => setSelectedPost(null)}
                currentUser={currentUser}
                onAddComment={handlePostCommented}
                onUserClick={handleUserClick}
                onSaveToggle={handleSaveToggle}
                onCommunityClick={handleCommunityClick}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Toaster position="top-center" />
    </div>
  );
}

// --- Main App Export ---
export default function App() {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('currentUser');
    return saved ? JSON.parse(saved) : defaultUser;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!localStorage.getItem('token'));
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [activeCommunity, setActiveCommunity] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  const fetchUnreadCount = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/notifications?accountId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        const unread = data.data.filter((n: any) => !n.isRead).length;
        setUnreadNotifications(unread);
      }
    } catch (err) { console.error('Lỗi tải thông báo:', err); }
  }, []);

  const fetchUnreadMessagesCount = useCallback(async (userId: string) => {
    if (!userId) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/messages/unread-count?userId=${encodeURIComponent(userId)}&_t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache' }
      });
      const data = await res.json();
      if (data.status === 'success') setUnreadMessagesCount(data.data);
    } catch (err) { console.error('Lỗi tải số tin nhắn chưa đọc:', err); }
  }, []);

  const fetchPosts = useCallback(async (userId: string = currentUser?.id || '', community: string | null = activeCommunity, filter: string = feedFilter) => {
    try {
      let url = `${API_URL}/posts?userId=${userId || ''}`;
      if (community) url += `&community=${community}`;
      if (filter === 'following' && userId) url += `&followingOnly=true`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'success') setPosts(data.data);
    } catch (err) { console.error('Failed to fetch posts:', err); }
  }, [activeCommunity, feedFilter, currentUser.id]);

  useEffect(() => {
    if (isAuthenticated && (currentUser.id || currentUser._id)) {
      fetchUnreadCount(currentUser.id || String(currentUser._id));
      fetchUnreadMessagesCount(currentUser.id || String(currentUser._id));
    }
  }, [isAuthenticated, currentUser.id, currentUser._id, fetchUnreadCount, fetchUnreadMessagesCount]);

  useEffect(() => {
    fetchPosts(currentUser?.id || '');
  }, [activeCommunity, feedFilter, fetchPosts, currentUser?.id]);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(defaultUser);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    toast.success('Đã đăng xuất');
  };

  return (
    <SocketProvider userId={currentUser?.id || currentUser?._id}>
      <AppContent 
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        isAuthenticated={isAuthenticated}
        setIsAuthenticated={setIsAuthenticated}
        unreadNotifications={unreadNotifications}
        setUnreadNotifications={setUnreadNotifications}
        unreadMessagesCount={unreadMessagesCount}
        setUnreadMessagesCount={setUnreadMessagesCount}
        activeCommunity={activeCommunity}
        setActiveCommunity={setActiveCommunity}
        feedFilter={feedFilter}
        setFeedFilter={setFeedFilter}
        posts={posts}
        setPosts={setPosts}
        handleLogout={handleLogout}
        fetchPosts={fetchPosts}
        fetchUnreadMessagesCount={fetchUnreadMessagesCount}
        fetchUnreadCount={fetchUnreadCount}
      />
    </SocketProvider>
  );
}




