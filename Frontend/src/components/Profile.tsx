// Debug: 2026-03-26T13:13:14 (Forcing Vite Reload)
import { useState, useRef, useEffect } from 'react';
import { Camera, Mail, Calendar, MapPin, Link as LinkIcon, Edit, X, Save, MessageCircle, User, AtSign, Globe, ShieldCheck, UserPlus, Check, UserMinus, UserCheck, Clock, Lock, Key, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import PostCard from './PostCard';
import type { Post } from './PostCard';
import { getImageUrl } from '@/lib/imageUtils';
import { API_URL } from '@/lib/api';
import { ImageAdjuster } from './ImageAdjuster';

interface ProfileProps {
  currentUser: {
    id?: string;
    name: string;
    avatar: string;
    username: string;
    bio?: string;
    location?: string;
    website?: string;
  };
  viewedUserId?: string | null;
  userPosts: Post[];
  onPostClick?: (post: Post) => void;
  onAvatarChange?: (newAvatar: string) => void;
  onProfileUpdate?: (updatedData: any) => void;
  onPostsChanged?: () => void;
  onUserClick?: (userId: string) => void;
}

interface PasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  oldPassword: string;
  setOldPassword: (v: string) => void;
  newPassword: string;
  setNewPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showOldPassword: boolean;
  setShowOldPassword: (v: boolean) => void;
  showNewPassword: boolean;
  setShowNewPassword: (v: boolean) => void;
  isChangingPassword: boolean;
}

const AppChangePasswordDialog = ({
  isOpen, onClose, onSubmit,
  oldPassword, setOldPassword,
  newPassword, setNewPassword,
  confirmPassword, setConfirmPassword,
  showOldPassword, setShowOldPassword,
  showNewPassword, setShowNewPassword,
  isChangingPassword
}: PasswordModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md overflow-hidden shadow-2xl border-none bg-card animate-in zoom-in-95 duration-200">
        <div className="bg-gradient-to-r from-red-600 to-red-500 p-6 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
            <Lock className="h-8 w-8 text-white" />
          </div>
          <h3 className="text-xl font-bold">Thay đổi mật khẩu</h3>
          <p className="text-red-100 text-sm mt-1">Nên sử dụng mật khẩu mạnh để bảo mật</p>
        </div>
        
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground/90">Mật khẩu hiện tại</Label>
            <div className="relative">
              <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showOldPassword ? "text" : "password"}
                value={oldPassword}
                onChange={e => setOldPassword(e.target.value)}
                placeholder="Nhập mật khẩu cũ"
                className="pl-10 h-11 bg-muted border-border focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowOldPassword(!showOldPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOldPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground/90">Mật khẩu mới</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="pl-10 h-11 bg-muted border-border focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold text-foreground/90">Xác nhận mật khẩu mới</Label>
            <div className="relative">
              <Check className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="pl-10 h-11 bg-muted border-border focus-visible:ring-red-500/20 focus-visible:border-red-500"
                required
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-11 rounded-lg border-border hover:bg-muted"
              disabled={isChangingPassword}
            >
              Hủy bỏ
            </Button>
            <Button
              type="submit"
              className="flex-[2] h-11 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
              disabled={isChangingPassword}
            >
              {isChangingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};


interface ProfileProps {
  currentUser: {
    id?: string;
    name: string;
    avatar: string;
    username: string;
    bio?: string;
    location?: string;
    website?: string;
  };
  viewedUserId?: string | null;
  userPosts: Post[];
  onPostClick?: (post: Post) => void;
  onAvatarChange?: (newAvatar: string) => void;
  onProfileUpdate?: (updatedData: any) => void;
  onPostsChanged?: () => void;
  onUserClick?: (userId: string) => void;
}

export function Profile({ currentUser, viewedUserId, userPosts, onPostClick, onAvatarChange, onProfileUpdate, onPostsChanged, onUserClick }: ProfileProps) {
  const [activeTab, setActiveTab] = useState('posts');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: currentUser.name || '',
    bio: currentUser.bio || '',
    location: currentUser.location || '',
    website: currentUser.website || ''
  });

  // States for Change Password
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const effectiveUserId = viewedUserId || currentUser.id || (currentUser as any)._id;
  const isOwnProfile = !viewedUserId || viewedUserId === (currentUser.id || (currentUser as any)._id);

  const [userComments, setUserComments] = useState<any[]>([]);
  const [userStats, setUserStats] = useState({ posts: 0, totalLikes: 0 });
  const [profileData, setProfileData] = useState<any>(isOwnProfile ? currentUser : { name: 'Đang tải...', username: 'loading', avatar: '' });
  const [followers, setFollowers] = useState<any[]>([]);
  const [following, setFollowing] = useState<any[]>([]);
  const [friendRequests, setFriendRequests] = useState<any[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [friendStatus, setFriendStatus] = useState<'none' | 'friend' | 'sent' | 'received'>('none');
  const [savedPosts, setSavedPosts] = useState<Post[]>([]);
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [isAdjustingAvatar, setIsAdjustingAvatar] = useState(false);
  const [followerTab, setFollowerTab] = useState<'followers' | 'following'>('followers');

  useEffect(() => {
    if (effectiveUserId) {
      // Tải thông tin profile
      const url = `${API_URL}/auth/profile/${effectiveUserId}${isOwnProfile ? '' : `?currentUserId=${currentUser.id || ''}`}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            const u = data.data;
            setProfileData({
              id: u._id,
              name: u.full_name || u.username,
              avatar: getImageUrl(u.avatar_url),
              username: u.username,
              bio: u.bio,
              location: u.location,
              website: u.website
            });
            
            setFollowersCount(u.followersCount || 0);
            setFollowingCount(u.followingCount || 0);

            if (!isOwnProfile) {
              setIsFollowing(!!u.isFollowing);
              // Legacy support cho friendStatus nếu cần
              setFriendStatus(u.friendStatus || 'none');
            }
          }
        })
        .catch(err => console.error('Lỗi khi tải thông tin hồ sơ:', err));

      // Tải bình luận
      fetch(`${API_URL}/comments/user/${effectiveUserId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setUserComments(data.data);
        })
        .catch(err => console.error('Lỗi khi tải bình luận:', err));

      // Tải thống kê (bài viết & lượt thích)
      fetch(`${API_URL}/auth/stats/${effectiveUserId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setUserStats(data.data);
        })
        .catch(err => console.error('Lỗi khi tải thống kê:', err));

      // Tải danh sách người theo dõi
      fetch(`${API_URL}/auth/friends/followers/${effectiveUserId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setFollowers(data.data);
        })
        .catch(err => console.error('Lỗi khi tải người theo dõi:', err));

      // Tải danh sách đang theo dõi
      fetch(`${API_URL}/auth/friends/following/${effectiveUserId}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setFollowing(data.data);
        })
        .catch(err => console.error('Lỗi khi tải đang theo dõi:', err));

      // Tải yêu cầu kết bạn (chỉ cho chính mình)
      if (isOwnProfile) {
        fetch(`${API_URL}/auth/friends/requests/${effectiveUserId}`)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'success') setFriendRequests(data.data);
          })
          .catch(err => console.error('Lỗi khi tải yêu cầu kết bạn:', err));
          
        fetch(`${API_URL}/posts/saved/${effectiveUserId}?userId=${currentUser.id || ''}`)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'success') {
              const formatted = data.data.map((p: any) => ({
                id: p._id,
                author: {
                   id: p.author?._id,
                   name: p.author?.display_name || p.author?.username,
                   avatar: getImageUrl(p.author?.avatar_url),
                   username: p.author?.username
                },
                community: p.community || 'Chung',
                title: p.title,
                content: p.content,
                image: p.image_url ? getImageUrl(p.image_url) : undefined,
                image_urls: p.image_urls ? p.image_urls.map((url: string) => getImageUrl(url)) : [],
                timestamp: new Date(p.created_at).toLocaleString('vi-VN'),
                upvotes: p.upvotes || 0,
                downvotes: p.downvotes || 0,
                commentCount: p.commentCount || 0,
                userVote: p.userVote || null
              }));
              setSavedPosts(formatted);
            }
          })
          .catch(err => console.error('Lỗi khi tải bài viết đã lưu:', err));
      }
    }
  }, [effectiveUserId, isOwnProfile, currentUser]);

  const handleReactUpdate = (postId: string, action: string, type: string) => {
    // Cập nhật lạc quan (Optimistic update)
    setUserStats(prev => ({
      ...prev,
      totalLikes: action === 'like' ? prev.totalLikes + 1 : (action === 'unlike' ? Math.max(0, prev.totalLikes - 1) : prev.totalLikes)
    }));

    // Tải lại dữ liệu chính xác từ server sau một khoảng trễ ngắn
    setTimeout(() => {
      if (effectiveUserId) {
        fetch(`${API_URL}/auth/stats/${effectiveUserId}`)
          .then(res => res.json())
          .then(data => {
            if (data.status === 'success') setUserStats(data.data);
          })
          .catch(err => console.error('Lỗi khi cập nhật thống kê:', err));
      }
    }, 500);
  };

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn file ảnh (JPG, PNG)');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setTempAvatar(reader.result as string);
      setIsAdjustingAvatar(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/auth/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: currentUser.id,
          full_name: formData.name,
          bio: formData.bio,
          location: formData.location,
          website: formData.website
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Đã lưu thay đổi hồ sơ');
        setIsEditing(false);
        if (onProfileUpdate) onProfileUpdate(data.data);
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error('Lỗi máy chủ'); }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      toast.error('Vui lòng điền đầy đủ các trường');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Mật khẩu mới không khớp');
      return;
    }
    if (newPassword.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }

    setIsChangingPassword(true);
    try {
      const res = await fetch(`${API_URL}/auth/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: currentUser.id || (currentUser as any)._id,
          oldPassword,
          newPassword
        })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Đổi mật khẩu thành công!');
        setIsChangePasswordOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        toast.error(data.message || 'Lỗi khi đổi mật khẩu');
      }
    } catch (err) {
      toast.error('Lỗi kết nối server');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const stats = {
    posts: userStats.posts || userPosts.length,
    totalLikes: userStats.totalLikes || 0,
    cakeDay: '29 Tháng 1, 2024',
  };

  const renderPasswordDialog = () => (
    <AppChangePasswordDialog
      isOpen={isChangePasswordOpen}
      onClose={() => {
        setIsChangePasswordOpen(false);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }}
      onSubmit={handlePasswordChange}
      oldPassword={oldPassword}
      setOldPassword={setOldPassword}
      newPassword={newPassword}
      setNewPassword={setNewPassword}
      confirmPassword={confirmPassword}
      setConfirmPassword={setConfirmPassword}
      showOldPassword={showOldPassword}
      setShowOldPassword={setShowOldPassword}
      showNewPassword={showNewPassword}
      setShowNewPassword={setShowNewPassword}
      isChangingPassword={isChangingPassword}
    />
  );

  if (isEditing) {
    return (
      <>
        <div className="space-y-4">
          <Card className="border-0 shadow-xl overflow-hidden bg-card">
            {/* Header Cover Banner */}
            <div className="h-32 w-full bg-gradient-to-br from-red-700 via-red-500 to-orange-400 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-white/20 transition-colors rounded-full"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
  
            <div className="px-8 pb-8 flex flex-col relative">
              <div className="relative -mt-16 mb-4 flex justify-between items-end">
                <div className="relative group">
                  <Avatar className="h-28 w-28 border-4 border-background shadow-xl bg-card">
                    <AvatarImage src={getImageUrl(currentUser.avatar)} className="object-cover" />
                    <AvatarFallback className="text-3xl text-muted-foreground bg-muted">{currentUser.name[0]}</AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-0 right-0 h-9 w-9 rounded-full bg-red-600 text-white shadow-lg hover:bg-red-700 transition-transform scale-100 group-hover:scale-110"
                    onClick={handleAvatarClick}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
  
                <div className="pb-2">
                  <h2 className="text-2xl font-bold text-gray-900 leading-none mb-1">Cập nhật hồ sơ</h2>
                  <p className="text-sm text-gray-500">Làm mới thông tin cá nhân của bạn</p>
                </div>
              </div>
  
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
  
              <div className="mt-2 space-y-8">
                
                {/* Section: Thông tin cơ bản */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                      <User className="h-5 w-5 text-red-500" />
                      <h3 className="text-lg font-semibold text-foreground">Thông tin cơ bản</h3>
                  </div>
                  
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-foreground/90 font-medium text-xs uppercase tracking-wider">Tên người dùng</Label>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          value={currentUser.username}
                          disabled
                          className="pl-10 bg-muted border-transparent text-muted-foreground cursor-not-allowed"
                        />
                      </div>
                    </div>
  
                    <div className="space-y-2">
                      <Label htmlFor="displayName" className="text-gray-700 font-medium text-xs uppercase tracking-wider">Tên hiển thị</Label>
                      <Input
                        id="displayName"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="bg-slate-50 border-slate-200 focus-visible:ring-red-500/20 focus-visible:border-red-500 transition-all shadow-sm"
                      />
                    </div>
                  </div>
  
                  <div className="space-y-2">
                    <Label htmlFor="bio" className="text-foreground/90 font-medium text-xs uppercase tracking-wider">Giới thiệu bản thân (Tiểu sử)</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={e => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Viết vài dòng về công việc, sở thích của bạn..."
                      rows={3}
                      className="resize-none bg-muted border-border focus-visible:ring-red-500/20 focus-visible:border-red-500 transition-all shadow-sm"
                    />
                  </div>
                </div>
  
                {/* Section: Liên hệ & Mạng xã hội */}
                <div className="space-y-5">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                      <Globe className="h-5 w-5 text-red-500" />
                      <h3 className="text-lg font-semibold text-foreground">Liên hệ & Mạng xã hội</h3>
                  </div>
  
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="location" className="text-foreground/90 font-medium text-xs uppercase tracking-wider">Địa điểm sinh sống</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500/70" />
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={e => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Ví dụ: TP. Hồ Chí Minh"
                          className="pl-10 bg-muted border-border focus-visible:ring-red-500/20 focus-visible:border-red-500 shadow-sm transition-all"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="website" className="text-foreground/90 font-medium text-xs uppercase tracking-wider">Trang web cá nhân</Label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-red-500/70" />
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={e => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://..."
                          className="pl-10 bg-muted border-border focus-visible:ring-red-500/20 focus-visible:border-red-500 shadow-sm transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>
  
                {/* Section: Tùy chọn bảo mật (Hiển thị UI mẫu) */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-border pb-2">
                      <ShieldCheck className="h-5 w-5 text-red-500" />
                      <h3 className="text-lg font-semibold text-foreground">Cài đặt Quyền riêng tư</h3>
                  </div>
                  <div className="flex flex-col gap-3">
                     <div className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/50">
                        <div>
                           <p className="text-sm font-medium text-foreground">Bảo mật tài khoản</p>
                           <p className="text-xs text-muted-foreground">Bảo vệ tài khoản bằng mật khẩu mạnh</p>
                        </div>
                        <Button variant="outline" size="sm" className="text-red-600 border-red-200/50 hover:bg-red-50" onClick={(e) => { e.preventDefault(); setIsChangePasswordOpen(true); }}>Đổi mật khẩu</Button>
                     </div>
                  </div>
                </div>
  
              </div>
  
              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                >
                  Hủy bỏ
                </Button>
                <Button
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md transition-shadow hover:shadow-lg"
                  onClick={handleSaveProfile}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Lưu thay đổi
                </Button>
              </div>
            </div>
          </Card>
        </div>
        {renderPasswordDialog()}
        {isAdjustingAvatar && tempAvatar && (
          <ImageAdjuster
            imageSrc={tempAvatar}
            isCircle={true}
            aspectRatio={1}
            onCancel={() => setIsAdjustingAvatar(false)}
            onConfirm={async (blob) => {
              setIsAdjustingAvatar(false);
              const formData = new FormData();
              formData.append('image', blob, 'avatar.jpg');
              // Gửi kèm user_id để backend xác thực trước khi lưu lên Cloudinary
              if (currentUser.id) formData.append('user_id', currentUser.id);
              
              const loadingToast = toast.loading('Đang xử lý và tải ảnh đại diện...');
              try {
                // Truyền user_id qua query string để backend xác thực trước khi upload lên Cloudinary
                const uploadUrl = currentUser.id 
                  ? `${API_URL}/upload?user_id=${encodeURIComponent(currentUser.id)}` 
                  : `${API_URL}/upload`;
                const uploadRes = await fetch(uploadUrl, { method: 'POST', body: formData });
                const uploadData = await uploadRes.json();
                
                if (uploadData.status === 'success') {
                  const imageUrl = uploadData.data.url;
                  const res = await fetch(`${API_URL}/auth/profile`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accountId: currentUser.id, avatar_url: imageUrl })
                  });
                  const data = await res.json();
                  toast.dismiss(loadingToast);
                  if (data.status === 'success') {
                    const fullAvatarUrl = getImageUrl(imageUrl);
                    if (onAvatarChange) onAvatarChange(fullAvatarUrl);
                    setProfileData({ ...profileData, avatar: fullAvatarUrl });
                    toast.success('Đã cập nhật ảnh đại diện');
                  } else {
                    toast.error(data.message);
                  }
                } else {
                  toast.dismiss(loadingToast);
                  toast.error(uploadData.message || 'Lỗi lưu tệp!');
                }
              } catch (err) {
                toast.dismiss(loadingToast);
                toast.error('Lỗi kết nối máy chủ!');
              }
            }}
          />
        )}
      </>
    );
  }


  return (
    <div className="space-y-4">
      {/* Profile Header */}
      <Card className="border-border bg-muted p-6">
        <div className="flex flex-col items-center gap-4 md:flex-row">
          <div className="relative">
            <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
              <AvatarImage src={profileData.avatar} />
              <AvatarFallback className="text-2xl">{(profileData.name || profileData.username || '?')[0]}</AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="mb-1 text-2xl font-bold text-foreground">{profileData.name || profileData.full_name}</h1>
            <p className="mb-2 text-muted-foreground">@{profileData.username}</p>
            {profileData.bio && <p className="mb-3 text-sm text-foreground/90">{profileData.bio}</p>}

            <div className="mb-4 flex flex-wrap justify-center gap-3 md:justify-start">
              {profileData.location && (
                <Badge variant="secondary" className="gap-1 bg-slate-100 text-slate-700">
                  <MapPin className="h-3 w-3" />
                  {profileData.location}
                </Badge>
              )}
              {profileData.website && (
                <Badge variant="secondary" className="gap-1 bg-slate-100 text-blue-600 hover:underline">
                  <LinkIcon className="h-3 w-3" />
                  <a href={profileData.website} target="_blank" rel="noreferrer" className="truncate max-w-[150px]">Website</a>
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              {isOwnProfile ? (
                <Button
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Chỉnh sửa trang cá nhân
                </Button>
              ) : (
                <div className="flex gap-2">
                  {!isFollowing ? (
                    <Button 
                      size="sm" 
                      className="bg-red-600 hover:bg-red-700 text-white"
                      onClick={async () => {
                        const res = await fetch(`${API_URL}/auth/friends/follow`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ followerId: currentUser.id || (currentUser as any)._id, targetId: effectiveUserId })
                        });
                        if (res.ok) {
                          toast.success('Đã theo dõi người dùng này');
                          setIsFollowing(true);
                          setFollowersCount(prev => prev + 1);
                        } else {
                          const err = await res.json();
                          toast.error(err.message || 'Lỗi khi theo dõi');
                        }
                      }}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Theo dõi
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={async () => {
                        const res = await fetch(`${API_URL}/auth/friends/unfollow`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ followerId: currentUser.id || (currentUser as any)._id, targetId: effectiveUserId })
                        });
                        if (res.ok) {
                          toast.success('Đã bỏ theo dõi');
                          setIsFollowing(false);
                          setFollowersCount(prev => Math.max(0, prev - 1));
                        }
                      }}
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      Đang theo dõi
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-300 pt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{stats.posts}</div>
            <div className="text-sm text-gray-600">Bài viết</div>
          </div>
          <div className="text-center cursor-pointer hover:bg-slate-50 transition-colors p-1 rounded" onClick={() => setActiveTab('friends')}>
            <div className="text-2xl font-bold text-gray-900">{followersCount}</div>
            <div className="text-sm text-gray-600">Người theo dõi</div>
          </div>
        </div>
      </Card>

      {/* Profile Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 bg-muted">
          <TabsTrigger value="posts" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
            Bài viết
          </TabsTrigger>
          <TabsTrigger value="comments" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
            Bình luận
          </TabsTrigger>
          <TabsTrigger value="friends" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
            Người theo dõi ({followersCount})
          </TabsTrigger>
          <TabsTrigger value="saved" className="data-[state=active]:bg-background data-[state=active]:text-foreground">
            Đã lưu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 space-y-4">
          {userPosts.length > 0 ? (
            userPosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onPostClick={onPostClick} 
                currentUser={currentUser} 
                onReact={handleReactUpdate}
              />
            ))
          ) : (
            <Card className="border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">Chưa có bài viết nào</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comments" className="mt-4 space-y-4">
          {userComments.length > 0 ? (
            userComments.map(c => (
              <Card key={c._id} className="border-border bg-card p-4">
                <div className="flex gap-2 items-center text-xs text-muted-foreground mb-2">
                  <MessageCircle className="h-4 w-4 text-blue-500" />
                  Bình luận trên bài viết: <span className="font-semibold text-foreground italic">"{c.post?.title || 'Không rõ'}"</span>
                  <span className="mx-2">•</span>
                  {new Date(c.created_at).toLocaleString('vi-VN')}
                </div>
                <p className="text-foreground text-sm mb-2">{c.content}</p>
                {c.image_url && <img src={c.image_url} alt="Minh Họa Bình Luận" className="max-w-[150px] rounded" />}
              </Card>
            ))
          ) : (
            <Card className="border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">Chưa có bình luận nào</p>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="friends" className="mt-4 space-y-4">
          <div className="flex bg-muted p-1 rounded-lg w-fit mb-4">
             <button 
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${followerTab === 'followers' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setFollowerTab('followers')}
             >
                Người theo dõi ({followersCount})
             </button>
             <button 
                className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${followerTab === 'following' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setFollowerTab('following')}
             >
                Đang theo dõi ({followingCount})
             </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(followerTab === 'followers' ? followers : following).length > 0 ? (
              (followerTab === 'followers' ? followers : following).map(user => (
                <Card 
                  key={user._id} 
                  className="p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer border-border bg-card"
                  onClick={() => onUserClick && onUserClick(user._id)}
                >
                  <Avatar className="h-12 w-12 border-2 border-border/50">
                    <AvatarImage src={getImageUrl(user.avatar_url)} />
                    <AvatarFallback>{(user.full_name || user.username || '?').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-900 truncate">{user.full_name || user.username}</div>
                    <div className="text-xs text-gray-500 truncate">@{user.username}</div>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="col-span-full border-dashed border-2 bg-muted/20 p-12 text-center">
                <p className="text-muted-foreground">Chưa có ai trong danh sách này</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="saved" className="mt-4 space-y-4">
          {savedPosts.length > 0 ? (
            savedPosts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post} 
                onPostClick={onPostClick} 
                currentUser={currentUser} 
                onReact={handleReactUpdate}
              />
            ))
          ) : (
            <Card className="border-border bg-card p-12 text-center">
              <p className="text-muted-foreground">Chưa có bài viết nào được lưu</p>
            </Card>
          )}
        </TabsContent>
      </Tabs>
      {renderPasswordDialog()}
    </div>
  );
}
