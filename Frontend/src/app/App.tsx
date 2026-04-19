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

const isAbortError = (error: unknown) => {
  return error instanceof DOMException && error.name === 'AbortError';
};

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
  mssv?: string;
  faculty?: string;
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

const readAuthStorageItem = (key: 'token' | 'currentUser') => {
  try {
    return sessionStorage.getItem(key) || localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeAuthStorageItem = (key: 'token' | 'currentUser', value: string) => {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignore storage write failures
  }
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore storage write failures
  }
};

const removeAuthStorageItem = (key: 'token' | 'currentUser') => {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignore storage remove failures
  }
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore storage remove failures
  }
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
  fetchPosts: (userId?: string, comm?: string | null, filter?: string, pageNum?: number, append?: boolean) => Promise<void>;
  fetchUnreadMessagesCount: (userId: string) => Promise<void>;
  fetchUnreadCount: (userId: string) => Promise<void>;
  isLoadingMore?: boolean;
  hasMore?: boolean;
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
  fetchUnreadCount,
  isLoadingMore,
  hasMore
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

  const clearSharedPostQueryFromUrl = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const view = (params.get('view') || '').toLowerCase();
    const sharedPostId = sanitizeEntityId(params.get('id'));
    if (view !== 'post' || !sharedPostId) return;

    params.delete('view');
    params.delete('id');
    const nextQuery = params.toString();
    const nextUrl = `${location.pathname}${nextQuery ? `?${nextQuery}` : ''}`;
    navigate(nextUrl, { replace: true });
  }, [location.pathname, location.search, navigate]);

  const closeSelectedPost = useCallback(() => {
    setSelectedPost(null);
    clearSharedPostQueryFromUrl();
  }, [clearSharedPostQueryFromUrl]);

  const fetchAndOpenPostById = useCallback(async (postId: string): Promise<boolean> => {
    const normalizedPostId = sanitizeEntityId(postId);
    if (!normalizedPostId) return false;

    try {
      const normalizedCurrentUserId = sanitizeEntityId(currentUser.id || currentUser._id);
      const query = normalizedCurrentUserId ? `?userId=${encodeURIComponent(normalizedCurrentUserId)}` : '';
      const res = await fetch(`${API_URL}/posts/${encodeURIComponent(normalizedPostId)}${query}`, { cache: 'no-store' });
      if (!res.ok) return false;

      const data = await res.json();
      if (data?.status === 'success' && data?.data) {
        setSelectedPost(data.data);
        return true;
      }
    } catch (error) {
      console.error('Failed to fetch post by id:', error);
    }

    return false;
  }, [currentUser.id, currentUser._id]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const view = (params.get('view') || '').toLowerCase();
    const sharedPostId = sanitizeEntityId(params.get('id'));

    if (view !== 'post' || !sharedPostId) return;

    let cancelled = false;

    (async () => {
      const opened = await fetchAndOpenPostById(sharedPostId);
      if (!opened && !cancelled) {
        toast.error('Không tìm thấy bài viết được chia sẻ');
        return;
      }

      if (!cancelled && opened) {
        clearSharedPostQueryFromUrl();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.search, fetchAndOpenPostById, clearSharedPostQueryFromUrl]);

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
              description: message.content || '[Tệp đính kèm]',
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

    if (targetView === 'home') {
      fetchPosts(currentUser.id || currentUser._id);
    }
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
    
    if (postId) {
      await fetchAndOpenPostById(postId);
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
    writeAuthStorageItem('currentUser', JSON.stringify(updatedUser));
  };

  const handlePostDeleted = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
    if (selectedPost?.id === postId) setSelectedPost(null);
  };

  const syncCurrentUserToVisiblePosts = useCallback((nextUser: User, previousUser?: User) => {
    const nextUserId = sanitizeEntityId(nextUser.id || nextUser._id);
    const prevUserId = sanitizeEntityId(previousUser?.id || previousUser?._id);
    const matchIds = [nextUserId, prevUserId].filter(Boolean);

    const nextName = nextUser.name || previousUser?.name || '';
    const prevUsername = previousUser?.username || '';
    const nextUsername = nextUser.username || prevUsername || '';
    const nextAvatar = nextUser.avatar || previousUser?.avatar || '';
    const matchUsernames = [nextUsername, prevUsername]
      .map((value) => String(value || '').trim().toLowerCase())
      .filter(Boolean);

    const shouldPatchAuthor = (author: any) => {
      const authorId = sanitizeEntityId(author?.id || author?._id || author);
      if (authorId && matchIds.includes(authorId)) return true;

      const authorUsername = String(author?.username || '').trim().toLowerCase();
      return !!authorUsername && matchUsernames.includes(authorUsername);
    };

    const patchPostAuthor = (post: Post): Post => {
      if (!post?.author || !shouldPatchAuthor(post.author)) return post;
      return {
        ...post,
        author: {
          ...post.author,
          ...(nextName ? { name: nextName } : {}),
          ...(nextUsername ? { username: nextUsername } : {}),
          ...(nextAvatar ? { avatar: nextAvatar } : {})
        }
      };
    };

    setPosts(prev => prev.map(patchPostAuthor));
    setSelectedPost(prev => (prev ? patchPostAuthor(prev) : prev));
  }, [setPosts]);

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
                    <h2 className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Chủ đề</h2>
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
              {isLoadingMore && <div className="text-center text-sm text-muted-foreground py-4">Đang tải thêm...</div>}
              {!hasMore && posts.length > 0 && <div className="text-center text-sm text-muted-foreground py-4">Đã hết bài viết</div>}
            </div>
          </div>
        );
      case 'search': return <SearchView onPostClick={handlePostClick} onUserClick={handleUserClick} currentUser={currentUser} />;
      case 'profile': return (
        <Profile
          currentUser={currentUser}
          viewedUserId={viewedUserId}
          onPostClick={handlePostClick}
          onAvatarChange={(url) => {
            const updatedUser: User = { ...currentUser, avatar: getImageUrl(url) };
            setCurrentUser(updatedUser);
            writeAuthStorageItem('currentUser', JSON.stringify(updatedUser));
            syncCurrentUserToVisiblePosts(updatedUser, currentUser);
          }}
          onProfileUpdate={(data) => {
            const normalizedCurrentUserId = sanitizeEntityId(currentUser.id || currentUser._id);
            const normalizedUpdatedUserId = sanitizeEntityId(data?.id || data?._id || currentUser.id || currentUser._id);
            const updatedDisplayName = data?.full_name || data?.name || currentUser.name;
            const updatedUser: User = {
              ...currentUser,
              id: data?.id || currentUser.id,
              _id: data?.id || currentUser._id,
              name: updatedDisplayName,
              username: data?.username || currentUser.username,
              avatar: data?.avatar_url ? getImageUrl(data.avatar_url) : currentUser.avatar,
              bio: data?.bio ?? currentUser.bio,
              location: data?.location ?? currentUser.location,
              website: data?.website ?? currentUser.website,
              mssv: data?.mssv ?? currentUser.mssv,
              faculty: data?.faculty ?? currentUser.faculty
            };
            setCurrentUser(updatedUser);
            writeAuthStorageItem('currentUser', JSON.stringify(updatedUser));
            syncCurrentUserToVisiblePosts(updatedUser, currentUser);

            if (normalizedUpdatedUserId && normalizedUpdatedUserId === normalizedCurrentUserId) {
              const nextUserId = updatedUser.id || updatedUser._id || '';
              fetchPosts(nextUserId);

              if (selectedPost?.id) {
                const currentSelectedPostId = selectedPost.id;
                const query = nextUserId ? `?userId=${encodeURIComponent(String(nextUserId))}` : '';
                fetch(`${API_URL}/posts/${currentSelectedPostId}${query}`, { cache: 'no-store' })
                  .then((res) => (res.ok ? res.json() : Promise.reject(new Error('Fetch post failed'))))
                  .then((payload) => {
                    if (payload?.status === 'success' && payload?.data) {
                      setSelectedPost(payload.data);
                    }
                  })
                  .catch((err) => console.error('Failed to refresh selected post after profile update:', err));
              }
            }
          }}
          onPostsChanged={() => fetchPosts(currentUser.id || currentUser._id || '')}
          onUserClick={handleUserClick}
          onViewChange={handleViewChange}
        />
      );
      case 'create': return <CreatePost onPostCreated={handlePostCreated} currentUser={currentUser} />;
      case 'messages': return <Messages currentUser={currentUser} onUserClick={handleUserClick} onMessagesRead={() => fetchUnreadMessagesCount(currentUser.id || currentUser._id || '')} />;
      case 'notifications': return <Notifications currentUser={currentUser} onMarkAllAsRead={() => setUnreadNotifications(0)} onNotificationClick={handleNotificationClick} />;
      case 'settings': return <Settings currentUser={currentUser} onUpdatePreferences={(prefs) => { const u = {...currentUser, preferences: prefs}; setCurrentUser(u); writeAuthStorageItem('currentUser', JSON.stringify(u)); }} onLogout={handleLogout} />;
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
            writeAuthStorageItem('currentUser', JSON.stringify(newUser));
            writeAuthStorageItem('token', token);
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

      <div className={`hidden md:block fixed left-0 top-[5.5rem] bottom-6 z-40 transition-all duration-300 ${desktopSidebarOpen ? 'w-72 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
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

      <main className={`relative z-10 ml-0 pt-[5.5rem] transition-all duration-300 ${desktopSidebarOpen ? 'md:ml-72' : 'md:ml-0'}`}>
        <div className="mx-auto max-w-[1500px] px-4 pb-8 sm:px-6 lg:px-8">
          <div className="flex justify-center gap-8 xl:gap-10">
            <div className={`flex-1 w-full ${currentView === 'messages' ? 'max-w-[1320px]' : 'max-w-4xl'}`}>{renderContent()}</div>
            {currentView === 'home' && (
              <div className="hidden lg:block w-80 pt-1 sticky top-[100px] self-start">
                <TrendingContent onPostClick={handlePostClick} currentUser={currentUser} />
              </div>
            )}
          </div>
        </div>
      </main>

      <Dialog open={!!selectedPost} onOpenChange={(open) => { if (!open) closeSelectedPost(); }}>
        <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl w-[95vw] h-[90vh] p-0 overflow-hidden">
          <div className="sticky top-0 z-10 flex items-center justify-center p-4 border-b bg-background/95">
            <DialogTitle className="text-lg font-bold">
              {selectedPost ? `Bài viết của ${selectedPost.author.name || selectedPost.author.username}` : 'Chi tiết bài viết'}
            </DialogTitle>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={closeSelectedPost}
              className="absolute right-3 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Dong bai viet"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden">
            {selectedPost && (
              <PostDetail
                post={selectedPost}
                onBack={closeSelectedPost}
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
    const saved = readAuthStorageItem('currentUser');
    if (!saved) return defaultUser;
    try {
      const parsed = JSON.parse(saved);
      const normalizedUser: User = {
        ...defaultUser,
        ...parsed,
        id: parsed?.id || parsed?._id || defaultUser.id,
        _id: parsed?._id || parsed?.id || defaultUser._id,
        name: parsed?.name || parsed?.full_name || parsed?.display_name || parsed?.username || defaultUser.name,
        username: parsed?.username || defaultUser.username,
        avatar: parsed?.avatar || (parsed?.avatar_url ? getImageUrl(parsed.avatar_url) : defaultUser.avatar),
        role: ((parsed?.role || defaultUser.role) as string).toLowerCase() as User['role']
      };
      return normalizedUser;
    } catch {
      return defaultUser;
    }
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => !!readAuthStorageItem('token'));
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [activeCommunity, setActiveCommunity] = useState<string | null>(null);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const postsAbortRef = useRef<AbortController | null>(null);
  const unreadNotificationsAbortRef = useRef<AbortController | null>(null);
  const unreadMessagesAbortRef = useRef<AbortController | null>(null);
  const lastUnreadNotificationsFetchAtRef = useRef(0);
  const lastUnreadMessagesFetchAtRef = useRef(0);

  const fetchUnreadCount = useCallback(async (userId: string) => {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return;

    const now = Date.now();
    if (now - lastUnreadNotificationsFetchAtRef.current < 1500) return;
    lastUnreadNotificationsFetchAtRef.current = now;

    unreadNotificationsAbortRef.current?.abort();
    const controller = new AbortController();
    unreadNotificationsAbortRef.current = controller;

    try {
      const token = readAuthStorageItem('token');
      const res = await fetch(`${API_URL}/notifications/unread-count?accountId=${encodeURIComponent(normalizedUserId)}`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUnreadNotifications(Number(data.data || 0));
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to fetch unread notifications count:', err);
    }
  }, []);

  const fetchUnreadMessagesCount = useCallback(async (userId: string) => {
    const normalizedUserId = String(userId || '').trim();
    if (!normalizedUserId) return;

    const now = Date.now();
    if (now - lastUnreadMessagesFetchAtRef.current < 1500) return;
    lastUnreadMessagesFetchAtRef.current = now;

    unreadMessagesAbortRef.current?.abort();
    const controller = new AbortController();
    unreadMessagesAbortRef.current = controller;

    try {
      const token = readAuthStorageItem('token');
      const res = await fetch(`${API_URL}/messages/unread-count?userId=${encodeURIComponent(normalizedUserId)}`, {
        signal: controller.signal,
        cache: 'no-store',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      const data = await res.json();
      if (data.status === 'success') setUnreadMessagesCount(Number(data.data || 0));
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to fetch unread messages count:', err);
    }
  }, []);

  const fetchPosts = useCallback(async (userId: string = currentUser?.id || '', community: string | null = activeCommunity, filter: string = feedFilter, pageNum: number = 1, append: boolean = false) => {
    const normalizedUserId = String(userId || '').trim();

    const params = new URLSearchParams();
    if (normalizedUserId) params.set('userId', normalizedUserId);
    if (community) params.set('community', community);
    if (filter === 'following' && normalizedUserId) params.set('followingOnly', 'true');
    const limit = pageNum === 1 ? 2 : 1;
    const skip = pageNum === 1 ? 0 : pageNum;
    
    params.set('skip', String(skip));
    params.set('limit', String(limit));

    if (!append) {
      postsAbortRef.current?.abort();
      const controller = new AbortController();
      postsAbortRef.current = controller;
    }

    try {
      if (append) setIsLoadingMore(true);
      const queryString = params.toString();
      const url = queryString ? `${API_URL}/posts?${queryString}` : `${API_URL}/posts`;
      const res = await fetch(url, { signal: append ? undefined : postsAbortRef.current?.signal, cache: 'no-store' });
      const data = await res.json();
      if (data.status === 'success') {
        const fetchedPosts = data.data || [];
        setPosts(prev => {
          if (!append) return fetchedPosts;
          const existingIds = new Set(prev.map(p => p.id));
          const newPosts = fetchedPosts.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...newPosts];
        });
        if (fetchedPosts.length < limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.error('Failed to fetch posts:', err);
    } finally {
      if (append) setIsLoadingMore(false);
    }
  }, [activeCommunity, feedFilter, currentUser.id]);

  useEffect(() => {
    if (isAuthenticated && (currentUser.id || currentUser._id)) {
      fetchUnreadCount(currentUser.id || String(currentUser._id));
      fetchUnreadMessagesCount(currentUser.id || String(currentUser._id));
    }
  }, [isAuthenticated, currentUser.id, currentUser._id, fetchUnreadCount, fetchUnreadMessagesCount]);

  useEffect(() => {
    setPage(1);
    fetchPosts(currentUser?.id || '', activeCommunity, feedFilter, 1, false);
  }, [activeCommunity, feedFilter, fetchPosts, currentUser?.id]);

  useEffect(() => {
    if (page > 1) {
      fetchPosts(currentUser?.id || '', activeCommunity, feedFilter, page, true);
    }
  }, [page, activeCommunity, feedFilter, fetchPosts, currentUser?.id]);

  useEffect(() => {
    const handleScroll = () => {
      const isHome = window.location.pathname === '/' || window.location.pathname === '/home';
      if (!isHome) return;

      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 1500) {
        if (hasMore && !isLoadingMore) {
          setPage(prev => prev + 1);
        }
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, isLoadingMore]);

  useEffect(() => {
    return () => {
      postsAbortRef.current?.abort();
      unreadNotificationsAbortRef.current?.abort();
      unreadMessagesAbortRef.current?.abort();
    };
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(defaultUser);
    removeAuthStorageItem('currentUser');
    removeAuthStorageItem('token');
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
        isLoadingMore={isLoadingMore}
        hasMore={hasMore}
      />
    </SocketProvider>
  );
}




