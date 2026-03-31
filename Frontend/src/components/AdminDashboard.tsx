import { useState, useEffect } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Shield,
  Flag,
  Users,
  FileText,
  Settings as SettingsIcon,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Search,
  Pencil,
  Tag,
  Mail,
  Inbox,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL, API_BASE_URL } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUtils';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type AdminTab = 'reports' | 'posts' | 'users' | 'feedback' | 'locked' | 'hidden' | 'communities';

export function AdminDashboard({ currentUser }: { currentUser?: any }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [pendingPosts, setPendingPosts] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [lockedUsers, setLockedUsers] = useState<any[]>([]);
  const [hiddenPosts, setHiddenPosts] = useState<any[]>([]);
  const [communities, setCommunities] = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState({
    pendingReports: 0,
    pendingPosts: 0,
    totalUsers: 0,
    newFeedbacks: 0
  });
  
  const [users, setUsers] = useState<any[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingPost, setViewingPost] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    username: '', email: '', password: '', full_name: '', mssv: '', role: 'User'
  });

  const fetchStats = async () => {
    if (!currentUser?.id) return;
    try {
      console.log('[AdminDashboard] 🌐 Đang lấy thống kê từ:', `${API_URL}/admin/dashboard?admin_id=${currentUser.id}`);
      const res = await fetch(`${API_URL}/admin/dashboard?admin_id=${currentUser.id}`);
      console.log('[AdminDashboard] 📡 Response status:', res.status);
      const data = await res.json();
      console.log('[AdminDashboard] 📦 Dữ liệu nhận được:', data);
      
      if (data.status === 'success') {
        console.log('[AdminDashboard] ✅ Cập nhật stats:', data.data);
        setAdminStats(data.data);
      } else {
        console.warn('[AdminDashboard] ⚠️ Lỗi từ server:', data.message);
      }
    } catch (e) { 
      console.error('[AdminDashboard] 🚨 Lỗi tải thống kê:', e); 
    }
  };

  const handleSearchUsers = async (query = '') => {
    if (!currentUser?.id) return;
    try {
      const q = query ? `&search=${encodeURIComponent(query)}` : '';
      const res = await fetch(`${API_URL}/admin/users?admin_id=${currentUser.id}${q}`);
      const data = await res.json();
      if (data.status === 'success') {
        setUsers(data.data);
      }
    } catch (e) {
      toast.error('Lỗi tải danh sách người dùng!');
    }
  };

  useEffect(() => {
    fetchStats();
  }, [currentUser]);

  useEffect(() => {
    if (activeTab === 'reports' && currentUser?.id) {
      fetch(`${API_URL}/reports/pending?admin_id=${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setReports(data.data);
        })
        .catch(e => console.error('Lỗi tải danh sách báo cáo!'));
    } else if (activeTab === 'posts' && currentUser?.id) {
      fetch(`${API_URL}/posts/pending?admin_id=${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setPendingPosts(data.data);
        })
        .catch(e => console.error('Lỗi tải danh sách bài viết chờ duyệt!'));
    } else if (activeTab === 'feedback' && currentUser?.id) {
      fetch(`${API_URL}/feedback?admin_id=${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setFeedbacks(data.data);
        })
        .catch(e => console.error('Lỗi tải danh sách góp ý!'));
    } else if (activeTab === 'locked' && currentUser?.id) {
      fetch(`${API_URL}/admin/locked?admin_id=${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setLockedUsers(data.data);
        })
        .catch(e => console.error('Lỗi tải danh sách tài khoản bị khóa!'));
    } else if (activeTab === 'hidden' && currentUser?.id) {
      fetch(`${API_URL}/admin/hidden-posts?admin_id=${currentUser.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setHiddenPosts(data.data);
        })
        .catch(e => console.error('Lỗi tải danh sách bài viết bị ẩn!'));
    } else if (activeTab === 'communities' && currentUser?.id) {
      fetch(`${API_URL}/communities`)
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setCommunities(data.data);
        })
        .catch(e => console.error('Lỗi tải danh sách cộng đồng!'));
    } else if (activeTab === 'users' && currentUser?.id) {
      handleSearchUsers();
    }
  }, [activeTab, currentUser]);

  const handleReportAction = async (reportId: string, action: string) => {
    try {
      const res = await fetch(`${API_URL}/reports/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: currentUser?.id, report_id: reportId, action })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(`Đã xử lý! Hành động: ${action}`);
        setReports(reports.filter(r => r._id !== reportId));
        fetchStats(); // Cập nhật lại stats
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error('Lỗi mạng!'); }
  };

  const handlePostAction = async (postId: string, action: 'approve' | 'reject') => {
    try {
      const res = await fetch(`${API_URL}/posts/${postId}/${action}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: currentUser?.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success(action === 'approve' ? 'Đã duyệt bài viết!' : 'Đã từ chối bài viết!');
        setPendingPosts(pendingPosts.filter(p => p._id !== postId));
        fetchStats(); // Cập nhật lại stats
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error('Lỗi kết nối server!'); }
  };
  
  const handleFeedbackAction = async (feedbackId: string) => {
    try {
      const res = await fetch(`${API_URL}/feedback/${feedbackId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: currentUser?.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Đã đánh dấu là đã đọc!');
        setFeedbacks(feedbacks.map(f => f._id === feedbackId ? { ...f, status: 'read' } : f));
        fetchStats();
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error('Lỗi kết nối!'); }
  };

  const handleUnlock = async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: currentUser?.id, user_id: userId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Đã mở khóa tài khoản thành công!');
        setLockedUsers(lockedUsers.filter(u => u._id !== userId));
        fetchStats();
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error('Lỗi kết nối!'); }
  };

  const handleRestorePost = async (postId: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/posts/${postId}/restore`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: currentUser?.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Đã khôi phục bài viết thành công!');
        setHiddenPosts(hiddenPosts.filter(p => p._id !== postId));
        fetchStats();
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error('Lỗi kết nối!'); }
  };

  // Community Form State
  const [comFormData, setComFormData] = useState({
    name: '', description: '', icon: '👥'
  });

  const handleCreateCommunity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/communities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...comFormData, admin_id: currentUser?.id, creator_id: currentUser?.id })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Tạo cộng đồng thành công!');
        setCommunities([data.data, ...communities]);
        setComFormData({ name: '', description: '', icon: '👥' });
        fetchStats();
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error('Lỗi kết nối!'); }
  };

  const handleDeleteCommunity = async (communityId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cộng đồng này?')) return;
    try {
      const res = await fetch(`${API_URL}/communities/${communityId}?admin_id=${currentUser?.id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Đã xóa cộng đồng!');
        setCommunities(communities.filter(c => c._id !== communityId));
        fetchStats();
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error('Lỗi kết nối!'); }
  };
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', full_name: '', mssv: '', role: 'User'
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Lỗi tạo tài khoản');
      toast.success('Tạo tài khoản thành công!');
      setFormData({ username: '', email: '', password: '', full_name: '', mssv: '', role: 'User' });
      setIsCreateOpen(false);
      fetchStats(); // Cập nhật lại stats
      handleSearchUsers(userSearchQuery); // Refresh the list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editFormData, admin_id: currentUser?.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Lỗi cập nhật tài khoản');
      toast.success('Cập nhật tài khoản thành công!');
      setIsEditOpen(false);
      handleSearchUsers(userSearchQuery); // Refresh the list
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (user: any) => {
    setEditingUser(user);
    setEditFormData({
      username: user.username || '',
      email: user.email || '',
      password: '', // Để trống nếu không muốn đổi
      full_name: user.full_name || '',
      mssv: user.mssv || '',
      role: user.role || 'User'
    });
    setIsEditOpen(true);
  };

  const stats = [
    { label: 'Báo cáo mới', count: adminStats.pendingReports, icon: Flag, color: 'text-red-500' },
    { label: 'Bài viết chờ duyệt', count: adminStats.pendingPosts, icon: FileText, color: 'text-amber-500' },
    { label: 'Người dùng', count: adminStats.totalUsers, icon: Users, color: 'text-blue-500' },
    { label: 'Góp ý từ người dùng', count: feedbacks.filter(f => f.status === 'new').length, icon: Mail, color: 'text-purple-500' },
  ];

  // Đã đưa report vào CSDL thực (State `reports`)

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Bảng điều quản trị
          </h1>
          <p className="text-muted-foreground text-sm">Quản lý nội dung, người dùng và hệ thống</p>
        </div>
        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
          Quyền Admin
        </Badge>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-4 border-border bg-card">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg bg-muted ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                <p className="text-xl font-bold text-foreground">{stat.count}</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Tabs Layout */}
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1.5 bg-muted/60 rounded-xl w-full border border-border/60 shadow-inner">
        {(['reports', 'posts', 'locked', 'hidden', 'communities', 'users', 'feedback'] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-5 py-2.5 text-[14px] font-semibold rounded-lg transition-all flex items-center justify-center shrink-0 ${activeTab === tab
                ? 'bg-background text-primary shadow-sm dark:bg-card border border-border/50 shadow-black/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
          >
            {tab === 'reports' && 'Xử lý báo cáo'}
            {tab === 'posts' && 'Duyệt bài'}
            {tab === 'locked' && 'Tài khoản bị khóa'}
            {tab === 'hidden' && 'Bài viết vi phạm'}
            {tab === 'communities' && 'Chủ đề bài viết'}
            {tab === 'users' && 'Người dùng'}
            {tab === 'feedback' && 'Góp ý'}
          </button>
        ))}
      </div>

      <Card className="border-border bg-card">
        {activeTab === 'reports' && (
          <div className="p-0">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Danh sách báo cáo vi phạm</h3>
            </div>
            <div className="divide-y divide-border">
              {reports.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">Hiện không có báo cáo nào đang chờ.</div>
              ) : reports.map((report) => (
                <div key={report._id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/30 transition-colors gap-3">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-medium text-foreground border-l-2 border-red-500 pl-2">Lý do báo cáo: {report.reason}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                       Bài viết: <span className="italic">"{report.post?.title || 'Bài đã mất/xoá'}"</span>
                    </p>
                    <p className="text-xs text-muted-foreground">Người tố cáo: <span className="font-semibold">@{report.reporter?.username}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-primary hover:bg-primary/10 border border-primary/20"
                      onClick={() => setViewingPost(report.post)}
                    >
                      <Eye className="h-4 w-4 mr-1" /> Xem bài
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 border border-amber-200"
                      onClick={() => handleReportAction(report._id, 'warn_user')}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" /> Cảnh cáo
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-green-500 hover:text-green-600 hover:bg-green-50 border border-green-200"
                      onClick={() => handleReportAction(report._id, 'dismiss')}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Hủy báo cáo
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'posts' && (
          <div className="p-0">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Danh sách bài viết chờ duyệt</h3>
            </div>
            <div className="divide-y divide-border">
              {pendingPosts.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <h3 className="font-medium text-foreground">Không có bài viết nào chờ duyệt</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">Tất cả bài viết từ cộng đồng đều đã được xử lý xong.</p>
                </div>
              ) : pendingPosts.map((post) => (
                <div key={post._id} className="p-4 flex flex-col md:flex-row md:items-start justify-between hover:bg-muted/30 transition-colors gap-3">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-bold text-foreground">{post.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2">{post.content}</p>
                    <p className="text-xs text-muted-foreground/70 mt-2">Đăng bởi: <span className="font-semibold">@{post.author?.username}</span> • {new Date(post.created_at).toLocaleString('vi-VN')}</p>
                    {post.image_url && (
                      <div className="mt-2">
                        <img src={post.image_url.startsWith('http') ? post.image_url : `${API_BASE_URL}${post.image_url}`} alt="Post content" className="h-16 w-16 object-cover rounded-md border border-border" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setViewingPost(post)}
                      className="text-primary hover:bg-primary/10"
                    >
                      <Eye className="h-4 w-4 mr-1" /> Xem
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handlePostAction(post._id, 'approve')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Duyệt bài
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePostAction(post._id, 'reject')}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Từ chối
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}



        {activeTab === 'locked' && (
          <div className="p-0">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Danh sách tài khoản đang bị khóa</h3>
            </div>
            <div className="divide-y divide-border">
              {lockedUsers.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <XCircle className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <h3 className="font-medium text-foreground">Không có tài khoản nào bị khóa</h3>
                  <p className="text-sm text-muted-foreground">Hệ thống hiện tại không có người dùng nào vi phạm mức độ khóa.</p>
                </div>
              ) : (
                lockedUsers.map((user) => (
                  <div key={user._id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/30 transition-colors gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={getImageUrl(user.avatar_url)} />
                        <AvatarFallback>{user.username[0]}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-foreground">@{user.username} ({user.full_name || 'N/A'})</p>
                        <p className="text-xs text-red-500 font-medium">Lý do: {user.lock_reason}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          Cảnh cáo: {user.warning_count}/3 • Mở khóa lúc: {user.lock_until ? new Date(user.lock_until).toLocaleString('vi-VN') : 'Vĩnh viễn'}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-green-200 text-green-600 hover:bg-green-50 hover:text-green-700"
                      onClick={() => handleUnlock(user._id)}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mở khóa
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'hidden' && (
          <div className="p-0">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Kho lưu trữ bài viết vi phạm (Bằng chứng)</h3>
            </div>
            <div className="divide-y divide-border">
              {hiddenPosts.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <h3 className="font-medium text-foreground">Kho lưu trữ trống</h3>
                  <p className="text-sm text-muted-foreground">Chưa có bài viết nào bị ẩn vì lý do vi phạm.</p>
                </div>
              ) : (
                hiddenPosts.map((post) => (
                  <div key={post._id} className="p-4 flex flex-col md:flex-row md:items-start justify-between hover:bg-muted/30 transition-colors gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                         <Avatar className="h-6 w-6 border border-border">
                            <AvatarImage src={getImageUrl(post.author?.avatar_url)} />
                            <AvatarFallback>{post.author?.username[0]}</AvatarFallback>
                         </Avatar>
                         <span className="text-xs font-bold text-foreground">@{post.author?.username}</span>
                         <Badge variant="outline" className="text-[10px] bg-red-50 text-red-600 border-red-100">Đã ẩn</Badge>
                      </div>
                      <p className="text-sm font-semibold text-foreground">{post.title}</p>
                      <p className="text-xs text-muted-foreground line-clamp-3 bg-muted/50 p-2 rounded italic">"{post.content}"</p>
                      {post.image_url && (
                        <div className="mt-2">
                          <img src={post.image_url.startsWith('http') ? post.image_url : `${API_BASE_URL}${post.image_url}`} alt="Post content" className="h-20 w-20 object-cover rounded-md border border-border opacity-70 hover:opacity-100 transition-opacity" />
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary hover:bg-primary/10 border border-primary/20"
                        onClick={() => setViewingPost(post)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Xem
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green-200 text-green-600 hover:bg-green-50"
                        onClick={() => handleRestorePost(post._id)}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Khôi phục
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'communities' && (
          <div className="p-6 space-y-8">
            <div className="max-w-xl">
              <div className="flex items-center gap-3 mb-6">
                <Tag className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Quản lý chủ đề bài viết mới</h3>
              </div>
              <form onSubmit={handleCreateCommunity} className="space-y-4 bg-muted/30 p-4 rounded-xl border border-border">
                <div className="space-y-2">
                  <Label htmlFor="comName">Tên chủ đề *</Label>
                  <Input id="comName" required placeholder="VD: Công nghệ, Học tập, Giải trí..." value={comFormData.name} onChange={e => setComFormData({ ...comFormData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comDesc">Mô tả chủ đề</Label>
                  <textarea id="comDesc" className="flex min-h-[80px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 transition-all outline-none" placeholder="Giới thiệu ngắn gọn về chủ đề này..." value={comFormData.description} onChange={e => setComFormData({ ...comFormData, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="comIcon">Biểu tượng (Emoji)</Label>
                  <Input id="comIcon" placeholder="📚, 🎮, 🎨..." value={comFormData.icon} onChange={e => setComFormData({ ...comFormData, icon: e.target.value })} />
                </div>
                <Button type="submit" className="w-full">Thêm Chủ Đề Ngay</Button>
              </form>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                Danh sách chủ đề hiện có
                <Badge variant="secondary" className="ml-2">{communities.length}</Badge>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {communities.length === 0 ? (
                  <div className="col-span-full p-8 text-center text-muted-foreground border border-dashed rounded-xl">Chưa có chủ đề nào được tạo.</div>
                ) : communities.map((com) => (
                  <Card key={com._id} className="p-4 flex items-center justify-between group hover:border-primary/50 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-xl shrink-0">
                        {com.icon || '👥'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">{com.name}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{com.postCount || 0} bài viết</p>
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteCommunity(com._id)}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="p-0">
            <div className="p-4 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-foreground">Hòm thư góp ý</h3>
            </div>
            <div className="divide-y divide-border">
              {feedbacks.length === 0 ? (
                <div className="p-8 text-center space-y-3">
                  <Inbox className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                  <h3 className="font-medium text-foreground">Hòm thư trống</h3>
                  <p className="text-sm text-muted-foreground">Chưa có góp ý nào từ người dùng.</p>
                </div>
              ) : feedbacks.map((feedback) => (
                <div key={feedback._id} className={`p-4 flex flex-col md:flex-row md:items-start justify-between hover:bg-muted/30 transition-colors gap-4 ${feedback.status === 'new' ? 'bg-primary/5' : ''}`}>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={
                        feedback.type === 'bug' ? 'text-red-500 border-red-200 bg-red-50' : 
                        feedback.type === 'suggestion' ? 'text-blue-500 border-blue-200 bg-blue-50' : 
                        'text-gray-500 border-gray-200 bg-gray-50'
                      }>
                        {feedback.type === 'bug' ? 'Lỗi' : feedback.type === 'suggestion' ? 'Góp ý' : 'Khác'}
                      </Badge>
                      {feedback.status === 'new' && <Badge className="bg-primary hover:bg-primary">Mới</Badge>}
                      <span className="text-xs text-muted-foreground">{new Date(feedback.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{feedback.content}</p>
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-muted/50 w-fit">
                       <img src={getImageUrl(feedback.user?.avatar_url)} alt="Avatar" className="h-6 w-6 rounded-full border border-border" />
                       <span className="text-xs font-medium text-muted-foreground">@{feedback.user?.username} ({feedback.user?.full_name})</span>
                    </div>
                  </div>
                  {feedback.status === 'new' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleFeedbackAction(feedback._id)}
                      className="shrink-0 border-primary/20 text-primary hover:bg-primary hover:text-white"
                    >
                      Đánh dấu đã đọc
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Search className="h-6 w-6 text-muted-foreground/60" />
                <h3 className="text-lg font-medium text-foreground">Tra cứu người dùng</h3>
              </div>
              
              <div className="flex gap-2">
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                  <DialogTrigger asChild>
                    <Button className="shrink-0 gap-2"><Users className="h-4 w-4" /> Tạo mới</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Tạo mới thành viên</DialogTitle>
                      <DialogDescription>
                        Điền thông tin bên dưới để cấp tài khoản mới cho hệ thống.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleRegister} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="username">Tài khoản *</Label>
                          <Input id="username" required value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email *</Label>
                          <Input id="email" type="email" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="password">Mật khẩu *</Label>
                          <Input id="password" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Vai trò</Label>
                          <select id="role" className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 transition-all outline-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Họ Tên</Label>
                          <Input id="full_name" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="mssv">MSSV</Label>
                          <Input id="mssv" value={formData.mssv} onChange={e => setFormData({ ...formData, mssv: e.target.value })} />
                        </div>
                      </div>
                      <Button type="submit" disabled={isLoading} className="mt-4 w-full">
                        {isLoading ? 'Đang xử lý...' : 'Tạo Tài Khoản'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Edit User Dialog */}
                <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
                      <DialogDescription>
                        Cập nhật thông tin cho tài khoản @{editingUser?.username}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdateUser} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="edit-username">Tài khoản</Label>
                          <Input id="edit-username" required value={editFormData.username} onChange={e => setEditFormData({ ...editFormData, username: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-email">Email</Label>
                          <Input id="edit-email" type="email" required value={editFormData.email} onChange={e => setEditFormData({ ...editFormData, email: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-password">Mật khẩu mới (Để trống nếu giữ nguyên)</Label>
                          <Input id="edit-password" type="password" placeholder="••••••••" value={editFormData.password} onChange={e => setEditFormData({ ...editFormData, password: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-role">Vai trò</Label>
                          <select id="edit-role" className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 transition-all outline-none" value={editFormData.role} onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}>
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-full_name">Họ Tên</Label>
                          <Input id="edit-full_name" value={editFormData.full_name} onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-mssv">MSSV</Label>
                          <Input id="edit-mssv" value={editFormData.mssv} onChange={e => setEditFormData({ ...editFormData, mssv: e.target.value })} />
                        </div>
                      </div>
                      <Button type="submit" disabled={isLoading} className="mt-4 w-full">
                        {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2 max-w-md">
                <Input 
                  placeholder="Tìm tài khoản, email, mssv..." 
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUsers(userSearchQuery)}
                />
                <Button onClick={() => handleSearchUsers(userSearchQuery)} variant="secondary">
                  Tìm
                </Button>
              </div>
              
              <div className="border rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                    <tr>
                      <th className="px-4 py-3">Người dùng</th>
                      <th className="px-4 py-3 hidden md:table-cell">Email / MSSV</th>
                      <th className="px-4 py-3 text-center">Vai trò</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground italic">Không tìm thấy người dùng nào.</td>
                      </tr>
                    ) : users.map(user => (
                      <tr key={user._id} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarImage src={getImageUrl(user.avatar_url)} />
                              <AvatarFallback>{user.username[0]}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                               <p className="font-bold text-foreground truncate">@{user.username}</p>
                               <p className="text-[11px] text-muted-foreground truncate">{user.full_name || 'Chưa đặt tên'}</p>
                            </div>
                            {user.is_locked && <Badge variant="destructive" className="ml-1 scale-75 origin-left">Locked</Badge>}
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-xs font-medium text-foreground">{user.email}</p>
                          <p className="text-[10px] text-muted-foreground">MSSV: {user.mssv || 'N/A'}</p>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={user.role?.toLowerCase() === 'admin' ? 'border-primary text-primary bg-primary/5' : ''}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openEditDialog(user)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Dialog chi tiết bài đăng */}
      <Dialog open={!!viewingPost} onOpenChange={(open) => !open && setViewingPost(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">{viewingPost?.title}</DialogTitle>
            <DialogDescription>
              Đăng bởi @{viewingPost?.author?.username} • {viewingPost && new Date(viewingPost.created_at).toLocaleString('vi-VN')}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="bg-muted/30 p-4 rounded-xl border border-border">
               <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                  {viewingPost?.content}
               </p>
            </div>

            {/* Hiển thị tất cả ảnh nếu có */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
               {viewingPost?.image_urls?.map((url: string, i: number) => (
                  <img 
                    key={i} 
                    src={getImageUrl(url)} 
                    className="w-full h-auto rounded-xl border border-border shadow-sm object-cover aspect-video" 
                    alt={`Ảnh ${i+1}`}
                  />
               ))}
               {!viewingPost?.image_urls && viewingPost?.image_url && (
                  <img 
                    src={getImageUrl(viewingPost.image_url)} 
                    className="w-full h-auto rounded-xl border border-border shadow-sm object-cover max-h-[400px] col-span-full" 
                    alt="Ảnh bài đăng"
                  />
               )}
            </div>

            <div className="flex items-center justify-between border-t border-border pt-6">
               <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarImage src={getImageUrl(viewingPost?.author?.avatar_url)} />
                    <AvatarFallback>{viewingPost?.author?.username?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-bold text-foreground">{viewingPost?.author?.display_name || viewingPost?.author?.username}</p>
                    <p className="text-xs text-muted-foreground">ID tác giả: {viewingPost?.author?._id}</p>
                  </div>
               </div>
               
               <div className="flex gap-3">
                  {activeTab === 'posts' && (
                    <>
                      <Button
                        onClick={() => {
                          handlePostAction(viewingPost._id, 'approve');
                          setViewingPost(null);
                        }}
                        className="bg-green-600 hover:bg-green-700 text-white font-bold"
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" /> Duyệt bài ngay
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          handlePostAction(viewingPost._id, 'reject');
                          setViewingPost(null);
                        }}
                        className="text-red-500 border-red-100 hover:bg-red-50 font-bold"
                      >
                        <XCircle className="h-4 w-4 mr-2" /> Từ chối
                      </Button>
                    </>
                  )}

                  {activeTab === 'hidden' && (
                    <Button
                      onClick={() => {
                        handleRestorePost(viewingPost._id);
                        setViewingPost(null);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white font-bold"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" /> Khôi phục bài viết
                    </Button>
                  )}

                  {activeTab === 'reports' && (
                    <Button
                      variant="outline"
                      onClick={() => setViewingPost(null)}
                      className="font-bold border-border"
                    >
                      Đóng
                    </Button>
                  )}
               </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
