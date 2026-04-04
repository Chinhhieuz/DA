import { useState, useEffect } from "react";
import { Filter, X } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
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
import { API_BASE_URL, API_URL } from '@/lib/api'

import '../index.css'




const initialPosts: Post[] = [];

export interface User {
  id?: string;
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

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState('home');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(defaultUser);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [initialPostId, setInitialPostId] = useState<string | null>(null);
  const [viewedUserId, setViewedUserId] = useState<string | null>(null);
  const [viewedUser, setViewedUser] = useState<User | null>(null);
  const [activeCommunity, setActiveCommunity] = useState<string | null>(null);
  const [lastFetchId, setLastFetchId] = useState<number>(0);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Khôi phục phiên đăng nhập từ localStorage
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedToken = localStorage.getItem('token');
    
    if (savedUser && savedToken) {
      try {
        const userData = JSON.parse(savedUser);
        if (userData._id && !userData.id) {
            userData.id = userData._id;
        }
        setCurrentUser(userData);
        setIsAuthenticated(true);
        
        // Refresh profile data from server to get latest avatar/info
        fetch(`${API_URL}/auth/profile/${userData.id || userData._id}`)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'success') {
              const u = data.data;
              const freshUser = {
                ...userData,
                name: u.full_name || u.username,
                avatar: getImageUrl(u.avatar_url),
                bio: u.bio,
                location: u.location,
                website: u.website,
                preferences: u.preferences || userData.preferences
              };
              setCurrentUser(freshUser);
              localStorage.setItem('currentUser', JSON.stringify(freshUser));
            }
          })
          .catch(err => console.error('Failed to refresh profile:', err));

        // Khôi phục view cuối cùng nếu có
        const lastView = localStorage.getItem('currentView');
        const lastViewedUserId = localStorage.getItem('viewedUserId');
        
        if (lastView) {
          setCurrentView(lastView);
          if (lastView === 'profile' && lastViewedUserId) {
             setViewedUserId(lastViewedUserId);
          }
        } else if (userData.role === 'admin') {
          setCurrentView('admin');
        }
        
        fetchUnreadCount(userData.id || userData._id);
      } catch (e) {
        console.error('Lỗi khôi phục session:', e);
        localStorage.removeItem('currentUser');
        localStorage.removeItem('token');
      }
    }
  }, []);

  useEffect(() => {
    if ('Notification' in window) {
      if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission();
      }
    }
  }, []);

  useEffect(() => {
    let newSocket: Socket | null = null;
    if (isAuthenticated && currentUser.id) {
       newSocket = io(API_BASE_URL);
       newSocket.emit('register', currentUser.id);
       setSocket(newSocket);

       newSocket.on('new_notification', (data) => {
          setUnreadNotifications(prev => prev + 1);
          // ... Notification permission check ...
          if ('Notification' in window && Notification.permission === 'granted') {
             const prefs = currentUser?.preferences;
             
             let shouldNotify = false;
             if (data.type === 'like' && prefs?.pushNotifications !== false) shouldNotify = true;
             if (data.type === 'comment' && prefs?.commentNotifications !== false) shouldNotify = true;
             if (data.type === 'mention') shouldNotify = true;
             if (data.type === 'friend_request') shouldNotify = true;
             if (data.type === 'system') shouldNotify = true;

             if (shouldNotify) {
               let title = 'Thông báo mới';
               if (data.type === 'friend_request') title = 'Lời mời kết bạn';
               else if (data.type === 'like') title = 'Thích bài viết';
               else if (data.type === 'comment') title = 'Bình luận mới';
               else if (data.type === 'mention') title = 'Bạn được nhắc tên';
               else if (data.type === 'system') title = 'Thông báo hệ thống';

               const body = data.type === 'friend_request'
                  ? `${data.senderName} đã gửi lời mời kết bạn`
                  : (data.type === 'system'
                    ? data.content
                    : (data.type === 'mention'
                       ? `${data.senderName} đã nhắc đến bạn trong một bình luận`
                       : (data.type === 'like' 
                          ? `${data.senderName} đã thích bài viết "${data.title}"`
                          : `${data.senderName} đã bình luận: "${data.content}"`)));

               new window.Notification(title, { body });
             }
          }
       });

       newSocket.on('notification_cancelled', (data) => {
          setUnreadNotifications(prev => Math.max(0, prev - 1));
       });
    }
    return () => {
       if (newSocket) {
         newSocket.disconnect();
         setSocket(null);
       }
    };
  }, [isAuthenticated, currentUser.id, currentUser?.preferences]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewQuery = params.get('view');
    const tokenQuery = params.get('token');
    const postIdQuery = params.get('postId');
    
    if (postIdQuery) {
      setInitialPostId(postIdQuery);
    }
    
    if (viewQuery === 'reset-password' && tokenQuery) {
      setResetToken(tokenQuery);
      setCurrentView('reset-password');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Xử lý luồng mở Deep Link bài viết từ URL
  useEffect(() => {
    if (initialPostId && posts.length > 0) {
      const foundPost = posts.find((p) => p.id === initialPostId);
      if (foundPost) {
        setSelectedPost(foundPost);
        // Dọn dẹp URL sau khi mở xong để F5 không khựng
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, '', newUrl);
      }
      setInitialPostId(null);
    }
  }, [initialPostId, posts]);

  useEffect(() => {
    if (currentUser?.preferences?.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [currentUser?.preferences?.darkMode]);

  const handleUserClick = (userId: string) => {
    if (!userId) {
      console.warn('App: handleUserClick called with empty userId');
      return;
    }
    console.log('App: Navigating to user profile:', userId);
    
    if (userId === currentUser.id) {
      setViewedUserId(null);
      setViewedUser(null);
      setCurrentView('profile');
      localStorage.setItem('currentView', 'profile');
      localStorage.removeItem('viewedUserId');
    } else {
      setViewedUserId(userId);
      setCurrentView('profile');
      localStorage.setItem('currentView', 'profile');
      localStorage.setItem('viewedUserId', userId);
    }
    setSelectedPost(null);
  };

  const fetchPosts = async (currentUserId?: string) => {
    const activeUserId = currentUserId !== undefined ? currentUserId : currentUser.id;
    const fetchId = Date.now();
    setLastFetchId(fetchId);
    
    const url = `${API_URL}/posts?userId=${activeUserId || ''}${activeCommunity ? `&community=${encodeURIComponent(activeCommunity)}` : ''}`;
    console.log(`[App] 🌐 Fetching posts from: ${url}`);
    try {
      const res = await fetch(url);
      const data = await res.json();
      
      // Chống race condition: Chỉ update nếu đây là request mới nhất
      if (data.status === 'success') {
        setLastFetchId(prev => {
          if (fetchId >= prev) {
            setPosts(data.data);
          }
          return prev;
        });
      }
    } catch (err) {
      console.error("Lỗi tải bài viết:", err);
    }
  };

  useEffect(() => {
    fetchPosts(currentUser.id);
  }, [currentUser.id, activeCommunity]);

  const fetchUnreadCount = async (userId: string) => {
    if (!userId) return;
    try {
      const res = await fetch(`${API_URL}/notifications?accountId=${userId}`);
      const data = await res.json();
      if (data.status === 'success') {
        const unread = data.data.filter((n: any) => !n.isRead).length;
        setUnreadNotifications(unread);
      }
    } catch (err) {
      console.error('Lỗi tải thông báo:', err);
    }
  };

  const handleViewChange = (view: string) => {
    const protectedViews = ['profile', 'create', 'messages', 'settings', 'notifications', 'groups', 'admin', 'saved'];
    if (!isAuthenticated && protectedViews.includes(view)) {
      setCurrentView('login');
      setMobileMenuOpen(false);
      return;
    }
    fetchPosts(currentUser.id);
    if (view === 'profile') {
      setViewedUserId(null);
      localStorage.removeItem('viewedUserId');
    }
    if (view === 'home') {
      setActiveCommunity(null);
    }
    setCurrentView(view);
    localStorage.setItem('currentView', view);
    setSelectedPost(null);
    setMobileMenuOpen(false);
    if (view === 'notifications') {
      setUnreadNotifications(0);
    }
  };

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
  };

  const handleNotificationClick = async (notif: any) => {
    // 1. Nếu là follow hoặc friend request -> Đi tới Profile của người gửi
    if (notif.type === 'follow' || notif.type === 'friend_request') {
      const senderId = notif.sender?._id || notif.sender;
      if (senderId) handleUserClick(senderId);
      return;
    }

    // 2. Nếu là các loại liên quan đến bài viết (like, comment, mention, system)
    const postId = (notif.post?._id || notif.post || '').toString();
    
    // Kiểm tra postId hợp lệ (có độ dài của MongoDB ObjectId)
    if (postId && postId.length === 24 && postId !== '[object Object]') {
      try {
        const url = `${API_URL}/posts/${postId}${currentUser ? `?userId=${currentUser.id}` : ''}`;
        console.log('[App] Notification click fetching:', url);
        
        const res = await fetch(url);
        
        if (!res.ok) {
          toast.error('Không thể tìm thấy bài viết này (có thể đã bị xóa hoặc bị khóa)');
          return;
        }

        const data = await res.json();
        
        if (data.status === 'success') {
          const p = data.data;

          // Cho phép xem chi tiết ngay cả khi bị ẩn/khóa (theo yêu cầu người dùng)
          // Nhưng vẫn thông báo cho người dùng biết trạng thái
          if (p.status === 'hidden' || p.status === 'rejected') {
            toast.info('Bạn đang xem bài viết đã bị quản trị viên ẩn/khóa.');
          } else if (p.status === 'pending') {
            toast.info('Bài viết này đang trong trạng thái chờ duyệt.');
          }

          // Use the post object directly, as the backend already mapped it to Post via formatPostData()
          handlePostClick(p);
        } else {
          toast.error('Không thể tìm thấy bài viết này');
        }
      } catch (err) {
        console.error('Error fetching post detail for notification:', err);
        toast.error('Lỗi khi tải chi tiết bài viết');
      }
    } else {
      console.warn('[App] Invalid or missing postId in notification:', notif);
      // Nếu là thông báo hệ thống và ID không hợp lệ, có thể chỉ là thông báo chung
      if (notif.type === 'system') {
        // Có thể mở một modal thông báo hệ thống nếu cần, tạm thời thông báo lỗi
        toast.info('Thông báo hệ thống: ' + (notif.content || ''));
      }
    }
  };

  const handleCommunityClick = (community: string) => {
    setActiveCommunity(community);
    setCurrentView('home');
    setSelectedPost(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePostCreated = (newPost: Post) => {
    fetchPosts(currentUser.id); // Cập nhật lại list bài từ CSDL
    setCurrentView('home');
  };

  const handlePostCommented = (postId: string, newComment: Comment) => {
    const updatedPosts = posts.map(post => {
      if (post.id === postId) {
        return { 
          ...post, 
          comments: [newComment, ...post.comments],
          commentCount: (post.commentCount || 0) + 1 
        };
      }
      return post;
    });
    setPosts(updatedPosts);
    if (selectedPost && selectedPost.id === postId) {
      setSelectedPost({ 
        ...selectedPost, 
        comments: [newComment, ...selectedPost.comments],
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



  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(defaultUser);
    fetchPosts(defaultUser.id);
    setCurrentView('login');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    toast.success('Đã đăng xuất thành công');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home':
        const displayPosts = posts;

        return (
          <div>
            {activeCommunity && (
              <div className="mb-6 p-5 bg-card border border-border rounded-2xl shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-primary" />
                <div className="flex items-center gap-4">
                  <div className="bg-primary/10 p-2.5 rounded-xl text-primary shadow-inner">
                    <Filter className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Bộ lọc đang hoạt động</h2>
                    <div className="flex items-center gap-2">
                       <span className="text-xl font-bold text-foreground leading-tight">{activeCommunity}</span>
                       <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 text-[9px] uppercase font-bold px-1.5 py-0">Chủ đề</Badge>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setActiveCommunity(null)}
                  className="hover:bg-primary hover:text-white border-primary/20 text-primary font-bold transition-all px-4 rounded-xl"
                >
                  <X className="h-3.5 w-3.5 mr-2" />
                  Xóa bộ lọc
                </Button>
              </div>
            )}
            {displayPosts.length > 0 ? (
              displayPosts.map((post) => (
                <PostCard 
                  key={post.id} 
                  post={post} 
                  onPostClick={handlePostClick} 
                  currentUser={currentUser} 
                  onUserClick={handleUserClick}
                  onSaveToggle={handleSaveToggle}
                  onCommunityClick={handleCommunityClick}
                />
              ))
            ) : (
              <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border">
                  <p className="text-muted-foreground">Không có bài viết nào trong chủ đề này.</p>
                  <Button variant="link" onClick={() => setActiveCommunity(null)} className="mt-2 text-primary">
                    Xem tất cả bài viết
                  </Button>
              </div>
            )}
          </div>
        );
      case 'search':
        return <SearchView onPostClick={handlePostClick} onUserClick={handleUserClick} currentUser={currentUser} />;
      case 'profile':
        return (
          <Profile
            currentUser={currentUser}
            viewedUserId={viewedUserId}

            onPostClick={handlePostClick}
            onAvatarChange={(newAvatar: string) => setCurrentUser({ ...currentUser, avatar: newAvatar })}
            onProfileUpdate={(updatedData: any) => setCurrentUser({
               ...currentUser,
               name: updatedData.full_name || currentUser.name,
               bio: updatedData.bio,
               location: updatedData.location,
               website: updatedData.website
            })}
            onPostsChanged={() => fetchPosts(currentUser.id)}
            onUserClick={handleUserClick}
          />
        );
      case 'create':
        return <CreatePost onPostCreated={handlePostCreated} currentUser={currentUser} />;
      case 'messages':
        return <Messages />;
      case 'notifications':
        return <Notifications 
          currentUser={currentUser} 
          socket={socket} 
          onMarkAllAsRead={() => setUnreadNotifications(0)}
          onNotificationClick={handleNotificationClick}
        />;
      case 'settings':
        return <Settings 
          currentUser={currentUser}
          onUpdatePreferences={(newPrefs: any) => setCurrentUser({...currentUser, preferences: newPrefs})}
          onLogout={handleLogout} />;
      case 'admin':
        return <AdminDashboard currentUser={currentUser} />;
      case 'saved':
        return <SavedPosts 
          currentUser={currentUser} 
          onPostClick={handlePostClick} 
          onUserClick={handleUserClick} 
          onSaveToggle={handleSaveToggle}
          onCommunityClick={handleCommunityClick}
          onBackHome={() => handleViewChange('home')}
        />;
      default:
        return null;
    }
  };

  if (currentView === 'reset-password' && resetToken) {
    return (
      <>
        <ResetPassword 
          token={resetToken} 
          onSuccess={() => {
             setResetToken(null);
             setCurrentView('login');
          }} 
        />
        <Toaster position="top-center" />
      </>
    );
  }

  if (currentView === 'login') {
    return (
      <>
        <Login 
          onLogin={(userData: any) => { 
            setIsAuthenticated(true); 
            if (userData && userData.user) {
              const u = userData.user;
              const newUser: User = {
                ...currentUser,
                id: u._id || u.id || '',
                name: u.full_name || u.username || 'Tài Khoản Mới',
                username: u.username || 'user',
                avatar: getImageUrl(u.avatar_url) || defaultUser.avatar,
                bio: u.bio,
                location: u.location,
                website: u.website,
                role: (u.role || 'user').toLowerCase() as 'user' | 'moderator' | 'admin',
                preferences: u.preferences || defaultUser.preferences,
                savedPosts: u.savedPosts || []
              };
              
              setCurrentUser(newUser);

              // Lưu vào localStorage để F5 không mất login
              localStorage.setItem('currentUser', JSON.stringify(newUser));
              if (userData.token) {
                localStorage.setItem('token', userData.token);
              }

              if (u.role && u.role.toLowerCase() === 'admin') {
                setCurrentView('admin');
              } else {
                setCurrentView('home');
              }
              // Load số thông báo chưa đọc
              fetchUnreadCount(u._id || u.id);
            } else {
              setCurrentView('home');
            }
          }} 
          onBackToHome={() => setCurrentView('home')}
        />
        <Toaster position="top-center" />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Header
        onViewChange={handleViewChange}
        onMenuToggle={() => setMobileMenuOpen(true)}
        onDesktopMenuToggle={() => setDesktopSidebarOpen(!desktopSidebarOpen)}
        notificationCount={unreadNotifications}
        isAuthenticated={isAuthenticated}
        currentUser={currentUser}
        onLogout={handleLogout}
        allPosts={posts}
        onPostClick={handlePostClick}
      />

      <div 
        className={`hidden md:block fixed left-0 top-16 bottom-0 z-40 transition-all duration-300 ${
          desktopSidebarOpen ? 'w-60 opacity-100' : 'w-0 opacity-0 overflow-hidden'
        }`}
      >
        <div className="w-60 h-full">
          <Sidebar currentView={currentView} onViewChange={handleViewChange} userRole={currentUser.role} />
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-60 bg-background border-r border-border p-0">
          <div className="p-4">
            <Sidebar currentView={currentView} onViewChange={handleViewChange} userRole={currentUser.role} />
          </div>
        </SheetContent>
      </Sheet>

      <main className={`ml-0 pt-16 transition-all duration-300 ${desktopSidebarOpen ? 'md:ml-60' : 'md:ml-0'}`}>
        <div className="mx-auto max-w-7xl p-4">
          <div className="flex justify-center gap-8">
            <div className="flex-1 max-w-4xl w-full">{renderContent()}</div>
            {currentView === 'home' && (
              <div className="hidden lg:block w-80">
                <TrendingContent onPostClick={handlePostClick} currentUser={currentUser} />
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={!!selectedPost} onOpenChange={(open) => {
        if (!open) {
          fetchPosts(currentUser.id);
          setSelectedPost(null);
        }
      }}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[95vw] sm:w-[90vw] h-[90vh] max-h-[90vh] p-0 border border-border/50 bg-background shadow-2xl rounded-2xl flex flex-col focus:outline-none overflow-hidden">
          {/* Header Sticky */}
          <div className="sticky top-0 z-10 flex items-center justify-center p-4 border-b border-border bg-background/95 backdrop-blur-sm shrink-0">
            <DialogTitle className="text-[19px] font-bold text-foreground">
              {selectedPost ? `Bài viết của ${selectedPost.author.name || selectedPost.author.username}` : 'Chi tiết bài viết'}
            </DialogTitle>
          </div>
          
          {/* Main Scrollable Content */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {selectedPost && (
              <PostDetail
                post={selectedPost}
                onBack={() => {
                  fetchPosts(currentUser.id);
                  setSelectedPost(null);
                }}
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
