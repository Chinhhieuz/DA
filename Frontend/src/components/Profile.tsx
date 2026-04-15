// Debug: 2026-03-26T13:13:14 (Forcing Vite Reload)
import { useState, useRef, useEffect } from 'react';
import { Camera, Mail, Calendar, MapPin, Link as LinkIcon, Edit, X, Save, MessageCircle, User, AtSign, Globe, ShieldCheck, UserPlus, Check, UserMinus, UserCheck, Clock, Lock, Key, Eye, EyeOff, GraduationCap, BookOpen } from 'lucide-react';
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
    mssv?: string;
    faculty?: string;
  };
  viewedUserId?: string | null;
  onPostClick?: (post: Post) => void;
  onAvatarChange?: (newAvatar: string) => void;
  onProfileUpdate?: (updatedData: any) => void;
  onPostsChanged?: () => void;
  onUserClick?: (userId: string) => void;
  onViewChange?: (view: string) => void;
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

const normalizeProfileId = (value: any): string => {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);

  if (typeof value === 'object') {
    if (typeof value.$oid === 'string') return value.$oid.trim();
    if (value._id !== undefined && value._id !== value) {
      const nested = normalizeProfileId(value._id);
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
      const raw = value.toString().trim();
      if (raw && raw !== '[object Object]') return raw;
    }
  }

  return '';
};

const sanitizeProfileId = (value: any): string => {
  const normalized = normalizeProfileId(value);
  if (!normalized) return '';

  const lowered = normalized.toLowerCase();
  if (lowered === 'undefined' || lowered === 'null' || normalized === '[object Object]') {
    return '';
  }

  return normalized;
};

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




export function Profile({ currentUser, viewedUserId, onPostClick, onAvatarChange, onProfileUpdate, onPostsChanged, onUserClick, onViewChange }: ProfileProps) {
  const [activeTab, setActiveTab] = useState('posts');
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: currentUser.name || '',
    bio: currentUser.bio || '',
    location: currentUser.location || '',
    website: currentUser.website || '',
    mssv: currentUser.mssv || '',
    faculty: currentUser.faculty || ''
  });

  // States for Change Password
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const currentUserId = sanitizeProfileId(currentUser.id || (currentUser as any)._id);
  const viewedProfileUserId = sanitizeProfileId(viewedUserId);
  const effectiveUserId = viewedProfileUserId || currentUserId;
  const isOwnProfile = !viewedProfileUserId || viewedProfileUserId === currentUserId;

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
  const [tempAvatar, setTempAvatar] = useState<string | null>(null);
  const [isAdjustingAvatar, setIsAdjustingAvatar] = useState(false);
  const [followerTab, setFollowerTab] = useState<'followers' | 'following'>('followers');
  const [internalUserPosts, setInternalUserPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (effectiveUserId) {
      const url = `${API_URL}/auth/profile/aggregated/${effectiveUserId}?currentUserId=${currentUserId || ''}`;
      fetch(url)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') {
            const aggr = data.data;
            const u = aggr.profile;
            setProfileData({
              id: u._id,
              name: u.full_name || u.username,
              avatar: getImageUrl(u.avatar_url),
              username: u.username,
              bio: u.bio,
              location: u.location,
              website: u.website,
              mssv: u.mssv,
              faculty: u.faculty
            });
            
            setFollowersCount(u.followersCount || 0);
            setFollowingCount(u.followingCount || 0);

            if (!isOwnProfile) {
              setIsFollowing(!!u.isFollowing);
              setFriendStatus(u.friendStatus || 'none');
            }

            setUserComments(aggr.comments || []);
            setUserStats(aggr.stats || { posts: 0, totalLikes: 0 });
            setFollowers(aggr.followers || []);
            setFollowing(aggr.following || []);
            setInternalUserPosts(aggr.userPosts || []);
            
            if (isOwnProfile) {
              setFriendRequests(aggr.friendRequests || []);
            }
          }
        })
        .catch(err => console.error('Lỗi khi tải thông tin hồ sơ tổng hợp:', err));
    }
  }, [effectiveUserId, isOwnProfile, currentUserId]);

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
          website: formData.website,
          mssv: formData.mssv,
          faculty: formData.faculty
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
    posts: userStats.posts || internalUserPosts.length,
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
            <div className="h-40 w-full bg-gradient-to-r from-red-600 via-red-500 to-amber-500 relative shadow-inner">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 text-white hover:bg-black/20 hover:text-white transition-colors rounded-full backdrop-blur-sm bg-black/10"
                onClick={() => setIsEditing(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
  
            <div className="px-8 pb-8 flex flex-col relative">
              <div className="relative -mt-20 mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div className="relative group self-start">
                  <Avatar className="h-32 w-32 border-[6px] border-background shadow-2xl bg-card">
                    <AvatarImage src={getImageUrl(currentUser.avatar)} className="object-cover" />
                    <AvatarFallback className="text-4xl text-muted-foreground font-black bg-muted">{currentUser.name[0]}</AvatarFallback>
                  </Avatar>
                  <Button
                    size="icon"
                    className="absolute bottom-1 right-1 h-10 w-10 rounded-full bg-red-600 text-white shadow-xl hover:bg-red-700 transition-transform scale-100 group-hover:scale-110 border-2 border-background"
                    onClick={handleAvatarClick}
                  >
                    <Camera className="h-5 w-5" />
                  </Button>
                </div>
  
                <div className="pb-2 md:text-right">
                  <h2 className="text-3xl font-black text-foreground leading-tight tracking-tight">Cập nhật hồ sơ</h2>
                  <p className="text-muted-foreground font-medium mt-1">Làm mới thông tin cá nhân của bạn</p>
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
                <div className="bg-muted/30 p-6 sm:p-8 rounded-[2rem] border border-border/50 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                      <div className="p-2.5 bg-red-500/10 rounded-xl">
                        <User className="h-5 w-5 text-red-600" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Thông tin cơ bản</h3>
                  </div>
                  
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2.5">
                      <Label className="text-muted-foreground font-bold text-[11px] uppercase tracking-widest pl-1">Tên người dùng</Label>
                      <div className="relative">
                        <AtSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          value={currentUser.username}
                          disabled
                          className="pl-10 h-12 bg-muted/50 border-transparent text-muted-foreground cursor-not-allowed font-medium rounded-xl"
                        />
                      </div>
                    </div>
  
                    <div className="space-y-2.5">
                      <Label htmlFor="displayName" className="text-foreground/90 font-bold text-[11px] uppercase tracking-widest pl-1">Tên hiển thị</Label>
                      <Input
                        id="displayName"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="bg-background h-12 border-border focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-red-500 transition-all shadow-sm rounded-xl font-medium"
                      />
                    </div>
                  </div>
  
                  <div className="space-y-2.5">
                    <Label htmlFor="bio" className="text-foreground/90 font-bold text-[11px] uppercase tracking-widest pl-1">Giới thiệu bản thân (Tiểu sử)</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={e => setFormData({ ...formData, bio: e.target.value })}
                      placeholder="Viết vài dòng về công việc, sở thích của bạn..."
                      rows={4}
                      className="resize-none bg-background border-border focus-visible:ring-2 focus-visible:ring-red-500/20 focus-visible:border-red-500 transition-all shadow-sm rounded-xl font-medium p-4 leading-relaxed"
                    />
                  </div>
                </div>
  
                {/* Section: Liên hệ & Mạng xã hội */}
                <div className="bg-muted/30 p-6 sm:p-8 rounded-[2rem] border border-border/50 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                      <div className="p-2.5 bg-blue-500/10 rounded-xl">
                        <Globe className="h-5 w-5 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Liên hệ & Mạng xã hội</h3>
                  </div>
  
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2.5">
                      <Label htmlFor="location" className="text-foreground/90 font-bold text-[11px] uppercase tracking-widest pl-1">Địa điểm sinh sống</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={e => setFormData({ ...formData, location: e.target.value })}
                          placeholder="Ví dụ: TP. Hồ Chí Minh"
                          className="pl-10 h-12 bg-background border-border focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 shadow-sm transition-all rounded-xl font-medium"
                        />
                      </div>
                    </div>
                    <div className="space-y-2.5">
                      <Label htmlFor="website" className="text-foreground/90 font-bold text-[11px] uppercase tracking-widest pl-1">Trang web cá nhân</Label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="website"
                          value={formData.website}
                          onChange={e => setFormData({ ...formData, website: e.target.value })}
                          placeholder="https://..."
                          className="pl-10 h-12 bg-background border-border focus-visible:ring-2 focus-visible:ring-blue-500/20 focus-visible:border-blue-500 shadow-sm transition-all rounded-xl font-medium"
                        />
                      </div>
                    </div>
                  </div>
                </div>
  
                {/* Section: Thông tin học tập */}
                <div className="bg-muted/30 p-6 sm:p-8 rounded-[2rem] border border-border/50 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 border-b border-border/50 pb-4">
                      <div className="p-2.5 bg-green-500/10 rounded-xl">
                        <GraduationCap className="h-5 w-5 text-green-600" />
                      </div>
                      <h3 className="text-xl font-bold text-foreground tracking-tight">Thông tin học tập</h3>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2">
                    <div className="space-y-2.5">
                        <Label htmlFor="mssv" className="text-foreground/90 font-bold text-[11px] uppercase tracking-widest pl-1">Mã số sinh viên (MSSV)</Label>
                        <div className="relative">
                          <Check className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="mssv"
                            value={formData.mssv}
                            onChange={e => setFormData({ ...formData, mssv: e.target.value })}
                            placeholder="Ví dụ: 20110XXX"
                            className="pl-10 h-12 bg-background border-border focus-visible:ring-2 focus-visible:ring-green-500/20 focus-visible:border-green-500 shadow-sm transition-all rounded-xl font-medium"
                          />
                        </div>
                    </div>
                    <div className="space-y-2.5">
                        <Label htmlFor="faculty" className="text-foreground/90 font-bold text-[11px] uppercase tracking-widest pl-1">Chuyên Ngành</Label>
                        <div className="relative">
                          <BookOpen className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="faculty"
                            value={formData.faculty}
                            onChange={e => setFormData({ ...formData, faculty: e.target.value })}
                            placeholder="Ví dụ: Công nghệ thông tin"
                            className="pl-10 h-12 bg-background border-border focus-visible:ring-2 focus-visible:ring-green-500/20 focus-visible:border-green-500 shadow-sm transition-all rounded-xl font-medium"
                          />
                        </div>
                    </div>
                  </div>
                </div>
  
              </div>
  
              <div className="mt-8 pt-8 flex flex-col-reverse sm:flex-row justify-end gap-3 px-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditing(false)}
                  className="h-14 px-8 rounded-xl font-bold tracking-tight text-muted-foreground hover:bg-muted border-border transition-all w-full sm:w-auto"
                >
                  Hủy bỏ
                </Button>
                <Button
                  className="h-14 px-10 rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-700 hover:to-red-600 text-white font-bold tracking-tight shadow-[0_10px_20px_rgba(220,38,38,0.2)] hover:shadow-[0_15px_25px_rgba(220,38,38,0.3)] hover:-translate-y-0.5 transition-all active:scale-95 w-full sm:w-auto"
                  onClick={handleSaveProfile}
                >
                  <Save className="mr-2 h-5 w-5" />
                  Lưu thay đổi hồ sơ
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
    <div className="space-y-6">
      <section className="page-hero px-5 py-6 sm:px-7 sm:py-7">
        <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="page-soft-surface mb-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
              Profile
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">Ho so duoc trinh bay ro rang, gon va co diem nhan hon.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Khu vuc gioi thieu, thong tin nhanh va cac tab noi dung da duoc tach lop de de doc tren ca desktop lan mobile.
            </p>
          </div>
          <div className="page-stat-grid w-full max-w-xl">
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Bài viết</div>
              <div className="mt-2 text-2xl font-black text-foreground">{stats.posts}</div>
              <div className="mt-1 text-sm text-muted-foreground">Tổng số hiện có</div>
            </div>
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Theo dõi</div>
              <div className="mt-2 text-2xl font-black text-foreground">{followersCount}</div>
              <div className="mt-1 text-sm text-muted-foreground">Người đang quan tâm</div>
            </div>
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Yeu thich</div>
              <div className="mt-2 text-2xl font-black text-foreground">{stats.totalLikes}</div>
              <div className="mt-1 text-sm text-muted-foreground">Tổng lượt tương tác</div>
            </div>
          </div>
        </div>
      </section>
      {/* Profile Header */}
      <Card className="page-section-card p-6">
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
                <Badge variant="secondary" className="page-soft-surface gap-1 text-foreground">
                  <MapPin className="h-3 w-3" />
                  {profileData.location}
                </Badge>
              )}
              {profileData.website && (
                <Badge variant="secondary" className="page-soft-surface gap-1 text-blue-600 hover:underline">
                  <LinkIcon className="h-3 w-3" />
                  <a href={profileData.website} target="_blank" rel="noreferrer" className="truncate max-w-[150px]">Website</a>
                </Badge>
              )}
              {profileData.mssv && (
                <Badge variant="secondary" className="gap-1 bg-red-50 text-red-600 font-semibold border-red-100/50">
                  <GraduationCap className="h-3 w-3" />
                  MSSV: {profileData.mssv}
                </Badge>
              )}
              {profileData.faculty && (
                <Badge variant="secondary" className="gap-1 bg-orange-50 text-orange-600 font-semibold border-orange-100/50">
                  <BookOpen className="h-3 w-3" />
                  {profileData.faculty}
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap justify-center gap-2 md:justify-start">
              {isOwnProfile ? (
                <Button
                  size="sm"
                  className="rounded-full bg-primary px-5 text-primary-foreground hover:bg-primary/90"
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
                      className="rounded-full bg-red-600 text-white hover:bg-red-700"
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
                      className="rounded-full border-red-200 text-red-600 hover:bg-red-50"
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
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="rounded-full border-primary text-primary hover:bg-primary/5"
                    onClick={() => {
                      if (onViewChange) {
                        const targetId = sanitizeProfileId(
                          profileData?.id || (profileData as any)?._id || effectiveUserId
                        );
                        const currentId = currentUserId;
                        if (!targetId) {
                          toast.error('Khong tim thay nguoi dung de nhan tin');
                          return;
                        }
                        if (targetId === currentId) {
                          toast.error('Ban dang o dung trang ca nhan cua minh');
                          return;
                        }

                        localStorage.setItem('startChatWith', targetId);
                        onViewChange(`messages?chatWith=${encodeURIComponent(targetId)}`);
                      }
                    }}
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Nhắn tin
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-border/70 pt-4">
          <div className="page-soft-surface rounded-[22px] p-4 text-center">
            <div className="text-2xl font-bold text-foreground">{stats.posts}</div>
            <div className="text-sm text-muted-foreground">Bài viết</div>
          </div>
          <div className="page-soft-surface page-soft-hover cursor-pointer rounded-[22px] p-4 text-center transition-colors" onClick={() => setActiveTab('friends')}>
            <div className="text-2xl font-bold text-foreground">{followersCount}</div>
            <div className="text-sm text-muted-foreground">Theo dõi</div>
          </div>
        </div>
      </Card>

      {/* Profile Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
        <TabsList className="grid w-full grid-cols-3 p-1.5 bg-muted/60 rounded-2xl border border-border/50 shadow-inner h-14">
          <TabsTrigger value="posts" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/50 font-bold transition-all h-full text-[15px]">
            Bài viết
          </TabsTrigger>
          <TabsTrigger value="comments" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/50 font-bold transition-all h-full text-[15px]">
            Bình luận
          </TabsTrigger>
          <TabsTrigger value="friends" className="rounded-xl data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm border border-transparent data-[state=active]:border-border/50 font-bold transition-all h-full text-[15px]">
            Theo dõi ({followersCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-8 space-y-4">
          {internalUserPosts.length > 0 ? (
            internalUserPosts.map((post: Post) => (
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
                Theo dõi ({followersCount})
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
                    <div className="text-sm font-bold text-foreground truncate">{user.full_name || user.username}</div>
                    <div className="text-xs text-muted-foreground truncate">@{user.username}</div>
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

      </Tabs>
      {renderPasswordDialog()}
    </div>
  );
}
