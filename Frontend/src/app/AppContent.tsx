import { useState, useCallback, useRef } from "react";
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { toast } from 'sonner';
import { Header } from '@/components/Header';
import { Sidebar } from '@/components/Sidebar';
import { Post, Comment } from '@/components/PostCard';
import { PostDetail } from '@/components/PostDetail';
import { CreatePost } from '@/components/CreatePost';
import { Profile } from '@/components/Profile';
import { Messages } from '@/components/Messages';
import { Notifications } from '@/components/Notifications';
import { Settings } from '@/components/Settings';
import { SearchView } from '@/components/SearchView';
import { TrendingContent } from '@/components/TrendingContent';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Toaster } from '@/components/ui/sonner';
import { Login } from '@/components/Login';
import { AdminDashboard } from '@/components/AdminDashboard';
import { SavedPosts } from '@/components/SavedPosts';
import { getImageUrl } from '@/lib/imageUtils';
import type { AppUser as User, LoginPayload } from '@/types/user';
import type { NotificationItem } from '@/types/social';
import { HomeFeed } from './HomeFeed';
import { AppViewRoutes } from './AppViewRoutes';
import { useSharedPostDialog } from './useSharedPostDialog';
import { useAppRealtime } from './useAppRealtime';
import { useAppViewEffects } from './useAppViewEffects';
import {
  sanitizeEntityId,
  normalizeUserPreferences,
  defaultUser,
  writeAuthStorageItem,
  removeAuthStorageItem,
  isTokenUsable,
  readAuthToken,
  normalizeUserRole
} from './app-auth';
export interface AppContentProps {
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
  hasMorePosts: boolean;
  isFetchingPosts: boolean;
  handleLogout: () => void;
  fetchPosts: (userId?: string, comm?: string | null, filter?: string) => Promise<void>;
  fetchMorePosts: () => Promise<void>;
  fetchUnreadMessagesCount: (userId: string) => Promise<void>;
  fetchUnreadCount: (userId: string) => Promise<void>;
}

type ProfileUpdatePayload = Partial<{
  id: string;
  _id: string;
  full_name: string;
  name: string;
  username: string;
  avatar_url: string;
  bio: string;
  location: string;
  website: string;
  mssv: string;
  faculty: string;
}>;

export function AppContent({
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
  hasMorePosts,
  isFetchingPosts,
  handleLogout,
  fetchPosts,
  fetchMorePosts,
  fetchUnreadMessagesCount,
  fetchUnreadCount
}: AppContentProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(false);
  const loadMoreTriggerRef = useRef<HTMLDivElement | null>(null);

  const pathParts = location.pathname.substring(1).split('/');
  const currentView = pathParts[0] || 'home';
  const rawUrlUserId = currentView === 'profile' && pathParts[1] ? decodeURIComponent(pathParts[1]) : null;
  const urlUserId = sanitizeEntityId(rawUrlUserId);
  // Profile target should come from URL only.
  // This avoids stale local state/localStorage causing wrong profile id.
  const viewedUserId = currentView === 'profile' ? (urlUserId || null) : null;

  const {
    selectedPost,
    setSelectedPost,
    closeSelectedPost,
    fetchAndOpenPostById
  } = useSharedPostDialog({
    locationPathname: location.pathname,
    locationSearch: location.search,
    navigate
  });

  useAppRealtime({
    currentUser,
    setUnreadNotifications,
    setUnreadMessagesCount,
    fetchUnreadMessagesCount,
    navigate
  });
  useAppViewEffects({
    currentView,
    viewedUserId,
    loadMoreTriggerRef,
    hasMorePosts,
    isFetchingPosts,
    fetchMorePosts,
    postsLength: posts.length
  });

  const handleUserClick = (userId: string) => {
    const normalizedUserId = sanitizeEntityId(userId);
    if (!normalizedUserId) {
      toast.error('Khong tim thay ID nguoi dung');
      return;
    }

    const normalizedCurrentUserId = sanitizeEntityId(currentUser.id || currentUser._id);
    if (normalizedUserId === normalizedCurrentUserId) {
      // Click vao chinh minh -> mo profile cua minh (/profile)
      navigate('/profile');
    } else {
      // Click vao nguoi khac -> dieu huong /profile/:id
      navigate(`/profile/${encodeURIComponent(normalizedUserId)}`);
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
    if (targetView === 'home') setActiveCommunity(null);
    
    navigate(targetView === 'home' ? '/' : `/${normalizedView || targetView}`);
    setSelectedPost(null);
    setMobileMenuOpen(false);
    if (targetView === 'notifications') setUnreadNotifications(0);
    if (targetView === 'messages') fetchUnreadMessagesCount(currentUser.id || String(currentUser._id));
  };

  const handlePostClick = (post: Post) => setSelectedPost(post);

  const handleNotificationClick = async (notif: NotificationItem) => {
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

    const shouldPatchAuthor = (author: unknown) => {
      const typedAuthor = (author && typeof author === 'object') ? (author as Record<string, unknown>) : null;
      if (!typedAuthor) return false;
      const authorId = sanitizeEntityId(typedAuthor.id || typedAuthor._id || author);
      if (authorId && matchIds.includes(authorId)) return true;

      const authorUsername = String(typedAuthor.username || '').trim().toLowerCase();
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
  }, [setPosts, setSelectedPost]);

  const homeElement = (
    <HomeFeed
      feedFilter={feedFilter}
      isAuthenticated={isAuthenticated}
      onFeedFilterChange={setFeedFilter}
      activeCommunity={activeCommunity}
      onClearCommunity={() => setActiveCommunity(null)}
      posts={posts}
      currentUser={currentUser}
      onPostClick={handlePostClick}
      onUserClick={handleUserClick}
      onSaveToggle={handleSaveToggle}
      onCommunityClick={handleCommunityClick}
      onDeleteSuccess={handlePostDeleted}
      loadMoreTriggerRef={loadMoreTriggerRef}
      isFetchingPosts={isFetchingPosts}
      hasMorePosts={hasMorePosts}
    />
  );

  const profileElement = (
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
      onProfileUpdate={(data: ProfileUpdatePayload) => {
        const normalizedCurrentUserId = sanitizeEntityId(currentUser.id || currentUser._id);
        const normalizedUpdatedUserId = sanitizeEntityId(data?.id || data?._id || currentUser.id || currentUser._id);
        const updatedDisplayName = data?.full_name || data?.name || currentUser.name;
        const updatedUser: User = {
          ...currentUser,
          id: data?.id || data?._id || currentUser.id,
          _id: data?._id || data?.id || currentUser._id,
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
            void fetchAndOpenPostById(currentSelectedPostId);
          }
        }
      }}
      onPostsChanged={() => fetchPosts(currentUser.id || currentUser._id || '')}
      onUserClick={handleUserClick}
      onViewChange={handleViewChange}
    />
  );

  const searchElement = <SearchView onPostClick={handlePostClick} onUserClick={handleUserClick} currentUser={currentUser} />;
  const createElement = <CreatePost onPostCreated={handlePostCreated} currentUser={currentUser} />;
  const messagesElement = <Messages currentUser={currentUser} onUserClick={handleUserClick} onMessagesRead={() => fetchUnreadMessagesCount(currentUser.id || currentUser._id || '')} />;
  const notificationsElement = <Notifications currentUser={currentUser} onMarkAllAsRead={() => setUnreadNotifications(0)} onNotificationClick={handleNotificationClick} />;
  const settingsElement = (
    <Settings
      currentUser={currentUser}
      onUpdatePreferences={(prefs) => {
        const nextUser = { ...currentUser, preferences: normalizeUserPreferences(prefs) };
        setCurrentUser(nextUser);
        writeAuthStorageItem('currentUser', JSON.stringify(nextUser));
      }}
      onLogout={handleLogout}
    />
  );
  const adminElement = <AdminDashboard currentUser={currentUser} />;
  const savedElement = (
    <SavedPosts
      currentUser={currentUser}
      onPostClick={handlePostClick}
      onUserClick={handleUserClick}
      onSaveToggle={handleSaveToggle}
      onCommunityClick={handleCommunityClick}
      onBackHome={() => handleViewChange('home')}
    />
  );

  if (currentView === 'login') {
    return (
      <Login 
        onLogin={(userData?: LoginPayload) => { 
          const u = userData?.user;
          const token = String(userData?.token || u?.token || readAuthToken()).trim();
          if (!u || !isTokenUsable(token)) {
            setIsAuthenticated(false);
            setCurrentUser(defaultUser);
            removeAuthStorageItem('currentUser');
            removeAuthStorageItem('token');
            toast.error('Phien dang nhap khong hop le, vui long dang nhap lai');
            return;
          }

          setIsAuthenticated(true);
          const newUser: User = {
            ...currentUser,
            id: u._id || u.id,
            _id: u._id || u.id,
            name: u.full_name || u.username || defaultUser.name,
            username: u.username || defaultUser.username,
            avatar: getImageUrl(u.avatar_url) || defaultUser.avatar,
            role: normalizeUserRole(u.role),
            preferences: normalizeUserPreferences(u.preferences || defaultUser.preferences),
            savedPosts: u.savedPosts || []
          };
          setCurrentUser(newUser);
          writeAuthStorageItem('currentUser', JSON.stringify(newUser));
          writeAuthStorageItem('token', token);
          navigate(u.role?.toLowerCase() === 'admin' ? '/admin' : '/');
          const loggedInUserId = u._id || u.id || '';
          if (loggedInUserId) {
            fetchUnreadCount(loggedInUserId);
            fetchUnreadMessagesCount(loggedInUserId);
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
            <div className={`flex-1 w-full ${currentView === 'messages' ? 'max-w-[1320px]' : 'max-w-4xl'}`}>
              <AppViewRoutes
                isAuthenticated={isAuthenticated}
                isAdmin={currentUser.role === 'admin'}
                homeElement={homeElement}
                searchElement={searchElement}
                profileElement={profileElement}
                createElement={createElement}
                messagesElement={messagesElement}
                notificationsElement={notificationsElement}
                settingsElement={settingsElement}
                adminElement={adminElement}
                savedElement={savedElement}
              />
            </div>
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
      <Toaster position="top-center" expand={true} richColors />
    </div>
  );
}

