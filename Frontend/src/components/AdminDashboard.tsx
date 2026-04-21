import { useState, useEffect, useCallback } from 'react';
import DOMPurify from 'dompurify';
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
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Pencil,
  Tag,
  Mail,
  Inbox,
  Eye,
  Clock,
  X,
  Plus,
  Maximize2,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { API_URL, API_BASE_URL } from '@/lib/api';
import { getImageUrl } from '@/lib/imageUtils';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import type { AppUser } from '@/types/user';

type AdminTab = 'reports' | 'posts' | 'users' | 'feedback' | 'locked' | 'hidden' | 'communities';
interface AdminUserItem {
  _id?: string;
  username?: string;
  email?: string;
  full_name?: string;
  mssv?: string;
  role?: string;
  avatar_url?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  lock_reason?: string;
  warning_count?: number;
  lock_until?: string;
  is_locked?: boolean;
  [key: string]: unknown;
}

interface AdminPostItem {
  _id?: string;
  title?: string;
  content?: string;
  community?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  image_url?: string;
  image_urls?: string[];
  video_url?: string;
  ai_system_note?: string;
  author?: AdminUserItem;
  [key: string]: unknown;
}

interface AdminReportItem {
  _id?: string;
  reason?: string;
  description?: string;
  status?: string;
  created_at?: string;
  evidence_images?: string[];
  reporter?: AdminUserItem;
  post?: AdminPostItem;
  [key: string]: unknown;
}

interface FeedbackItem {
  _id?: string;
  content?: string;
  status?: string;
  type?: string;
  created_at?: string;
  user?: AdminUserItem;
  user_id?: AdminUserItem | string;
  [key: string]: unknown;
}

interface CommunityItem {
  _id?: string;
  name?: string;
  description?: string;
  icon?: string;
  postCount?: number;
  created_at?: string;
  [key: string]: unknown;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
};

const formatDateTime = (value?: string | number | Date | null) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'N/A' : date.toLocaleString('vi-VN');
};

const getUserInitial = (username?: string) => (username?.[0] || 'U').toUpperCase();

export function AdminDashboard({ currentUser }: { currentUser?: AppUser }) {
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');
  const [reports, setReports] = useState<AdminReportItem[]>([]);
  const [pendingPosts, setPendingPosts] = useState<AdminPostItem[]>([]);
  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [lockedUsers, setLockedUsers] = useState<AdminUserItem[]>([]);
  const [hiddenPosts, setHiddenPosts] = useState<AdminPostItem[]>([]);
  const [communities, setCommunities] = useState<CommunityItem[]>([]);
  const [adminStats, setAdminStats] = useState({
    pendingReports: 0,
    pendingPosts: 0,
    totalUsers: 0,
    newFeedbacks: 0
  });

  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateTopicOpen, setIsCreateTopicOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isEditTopicOpen, setIsEditTopicOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [editingTopic, setEditingTopic] = useState<CommunityItem | null>(null);
  const [viewingPost, setViewingPost] = useState<AdminPostItem | null>(null);
  const [viewingReport, setViewingReport] = useState<AdminReportItem | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [selectedCommPosts, setSelectedCommPosts] = useState<AdminPostItem[]>([]);
  const [isViewCommPostsOpen, setIsViewCommPostsOpen] = useState(false);
  const [loadingCommPosts, setLoadingCommPosts] = useState(false);
  const [activeCommName, setActiveCommName] = useState('');
  const [editFormData, setEditFormData] = useState({
    username: '', email: '', password: '', full_name: '', mssv: '', role: 'User'
  });
  const [editTopicFormData, setEditTopicFormData] = useState({
    name: '', description: '', icon: '👥'
  });
  const [formData, setFormData] = useState({
    username: '', email: '', password: '', full_name: '', mssv: '', role: 'User'
  });
  const [isLoading, setIsLoading] = useState(false);
  const adminUserId = currentUser?.id || currentUser?._id || '';

  const getAuthHeaders = useCallback((includeJson = false) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (includeJson) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }, []);

  const fetchStats = useCallback(async () => {
    if (!adminUserId) return;
    try {
      const res = await fetch(`${API_URL}/admin/dashboard`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();

      if (data.status === 'success') {
        setAdminStats(data.data);
      } else {
        console.warn('[AdminDashboard] ⚠️ Lỗi từ server:', data.message);
      }
    } catch (e) {
      console.error('[AdminDashboard] 🚨 Lỗi tải thống kê:', e);
    }
  }, [adminUserId, getAuthHeaders]);

  const handleSearchUsers = useCallback(async (query = '') => {
    if (!adminUserId) return;
    try {
      const q = query ? `?search=${encodeURIComponent(query)}` : '';
      const res = await fetch(`${API_URL}/admin/users${q}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.status === 'success') {
        setUsers(data.data);
      }
    } catch (e) {
      toast.error('Lỗi tải danh sách người dùng!');
    }
  }, [adminUserId, getAuthHeaders]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'reports' && adminUserId) {
      fetch(`${API_URL}/reports/pending`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setReports(data.data);
        })
        .catch(() => console.error('Lỗi tải danh sách báo cáo!'));
    } else if (activeTab === 'posts' && adminUserId) {
      fetch(`${API_URL}/posts/pending`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setPendingPosts(data.data);
        })
        .catch(() => console.error('Lỗi tải danh sách bài viết chờ duyệt!'));
    } else if (activeTab === 'feedback' && adminUserId) {
      fetch(`${API_URL}/feedback`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setFeedbacks(data.data);
        })
        .catch(() => console.error('Lỗi tải danh sách góp ý!'));
    } else if (activeTab === 'locked' && adminUserId) {
      fetch(`${API_URL}/admin/locked`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setLockedUsers(data.data);
        })
        .catch(() => console.error('Lỗi tải danh sách tài khoản bị khóa!'));
    } else if (activeTab === 'hidden' && adminUserId) {
      fetch(`${API_URL}/admin/hidden-posts`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setHiddenPosts(data.data);
        })
        .catch(() => console.error('Lỗi tải danh sách bài viết bị ẩn!'));
    } else if (activeTab === 'communities' && adminUserId) {
      fetch(`${API_URL}/communities`, { headers: getAuthHeaders() })
        .then(res => res.json())
        .then(data => {
          if (data.status === 'success') setCommunities(data.data);
        })
        .catch(() => console.error('Lỗi tải danh sách cộng đồng!'));
    } else if (activeTab === 'users' && adminUserId) {
      handleSearchUsers();
    }
  }, [activeTab, adminUserId, getAuthHeaders, handleSearchUsers]);

  const handleReportAction = async (reportId: string, action: string) => {
    try {
      const res = await fetch(`${API_URL}/reports/handle`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ report_id: reportId, action })
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
        headers: getAuthHeaders(true),
        body: JSON.stringify({})
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
        headers: getAuthHeaders(true),
        body: JSON.stringify({})
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
        headers: getAuthHeaders(true),
        body: JSON.stringify({ user_id: userId })
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
        headers: getAuthHeaders(true),
        body: JSON.stringify({})
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
        headers: getAuthHeaders(true),
        body: JSON.stringify({ ...comFormData, creator_id: adminUserId })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Tạo cộng đồng thành công!');
        setCommunities([data.data, ...communities]);
        setComFormData({ name: '', description: '', icon: '👥' });
        setIsCreateTopicOpen(false);
        fetchStats();
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error('Lỗi kết nối!'); }
  };

  const handleUpdateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTopic) return;
    try {
      const res = await fetch(`${API_URL}/communities/${editingTopic._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ ...editTopicFormData })
      });
      const data = await res.json();
      if (data.status === 'success') {
        toast.success('Cập nhật chủ đề thành công!');
        setCommunities(communities.map(c => c._id === editingTopic._id ? { ...c, ...data.data } : c));
        setIsEditTopicOpen(false);
        fetchStats();
      } else {
        toast.error(data.message);
      }
    } catch (e) { toast.error('Lỗi kết nối!'); }
  };

  const openEditTopicDialog = (topic: CommunityItem) => {
    setEditingTopic(topic);
    setEditTopicFormData({
      name: topic.name || '',
      description: topic.description || '',
      icon: topic.icon || '👥'
    });
    setIsEditTopicOpen(true);
  };

  const handleDeleteCommunity = async (communityId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa cộng đồng này?')) return;
    try {
      const res = await fetch(`${API_URL}/communities/${communityId}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
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

  /**
   * [ADMIN] Lấy toàn bộ bài viết của một chủ đề (bao gồm cả các bài chưa duyệt)
   * Giúp quản trị viên có cái nhìn tổng quát về hoạt động của từng chủ đề
   */
  const fetchCommunityPosts = async (communityName: string) => {
    if (!adminUserId) return;
    setLoadingCommPosts(true);         // 1. Hiệu ứng đang tải
    setActiveCommName(communityName); // 2. Ghi nhận tên chủ đề đang xem
    setIsViewCommPostsOpen(true);    // 3. Mở Dialog hiển thị
    try {
      // 4. Gọi API từ Backend, quyền được xác thực bằng Bearer token
      const res = await fetch(`${API_URL}/posts/admin/community/${encodeURIComponent(communityName)}`, {
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (data.status === 'success') {
        setSelectedCommPosts(data.data); // 5. Cập nhật danh sách bài viết nhận được
      } else {
        toast.error(data.message || 'Lỗi không xác định từ server');
      }
    } catch (e: unknown) {
      console.error('Error fetching community posts:', e);
      toast.error(`Lỗi tải danh sách bài viết: ${getErrorMessage(e, 'Khong ro loi')}`);
    } finally {
      setLoadingCommPosts(false); // 6. Kết thúc hiệu ứng tải
    }
  };

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
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Co loi xay ra'));
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
        headers: getAuthHeaders(true),
        body: JSON.stringify({ ...editFormData }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Lỗi cập nhật tài khoản');
      toast.success('Cập nhật tài khoản thành công!');
      setIsEditOpen(false);
      handleSearchUsers(userSearchQuery); // Refresh the list
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Co loi xay ra'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa tài khoản này không? Toàn bộ bài viết và bình luận của người dùng này sẽ bị gỡ bỏ vĩnh viễn!")) return;
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Lỗi xóa tài khoản');
      toast.success('Đã xóa tài khoản thành công!');
      fetchStats(); 
      handleSearchUsers(userSearchQuery); // Refresh the list
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'Co loi xay ra'));
    } finally {
      setIsLoading(false);
    }
  };

  const openEditDialog = (user: AdminUserItem) => {
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

      {/* Tabs Layout — Gộp & Tinh gọn */}
      <div className="flex overflow-x-auto no-scrollbar gap-1.5 p-1.5 bg-muted/60 rounded-xl w-full border border-border/60 shadow-inner">
        {(['reports', 'posts', 'locked', 'communities', 'users', 'feedback'] as AdminTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-5 py-2.5 text-[14px] font-semibold rounded-lg transition-all flex items-center justify-center shrink-0 ${(tab === 'reports' ? (activeTab === 'reports' || activeTab === 'hidden') : activeTab === tab)
              ? 'bg-background text-primary shadow-sm dark:bg-card border border-border/50 shadow-black/5'
              : 'text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/5'
              }`}
          >
            {tab === 'reports' && 'Kiểm duyệt nội dung'}
            {tab === 'posts' && 'Duyệt bài'}
            {tab === 'locked' && 'Tài khoản bị khóa'}
            {tab === 'communities' && 'Chủ đề bài viết'}
            {tab === 'users' && 'Người dùng'}
            {tab === 'feedback' && 'Góp ý'}
          </button>
        ))}
      </div>

      <Card className="border-border bg-card shadow-md overflow-hidden">
        {(activeTab === 'reports' || activeTab === 'hidden') && (
          <div className="p-0">
            <div className="p-4 border-b border-border bg-muted/20 flex flex-col items-center gap-4">
              <div className="flex p-1 bg-muted rounded-lg w-fit border border-border/50">
                <button
                  onClick={() => setActiveTab('reports')}
                  className={`px-6 py-1.5 text-xs font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'reports' ? 'bg-background text-primary shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Báo cáo chờ xử lý
                </button>
                <button
                  onClick={() => setActiveTab('hidden')}
                  className={`px-6 py-1.5 text-xs font-black uppercase tracking-widest rounded-md transition-all ${activeTab === 'hidden' ? 'bg-background text-primary shadow-sm border border-border/40' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Bài viết bị ẩn
                </button>
              </div>
            </div>

            {activeTab === 'reports' && (
              <div className="divide-y divide-border animate-in fade-in slide-in-from-top-1 duration-300">
                {reports.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Hiện không có báo cáo nào đang chờ.</div>
                ) : reports.map((report) => (
                  <div key={report._id} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/30 transition-colors gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter">Báo cáo mới</Badge>
                        <p className="text-sm font-bold text-foreground">Lý do: {report.reason}</p>
                      </div>

                      {report.description && (
                        <p className="text-xs text-foreground/80 bg-muted/50 p-2 rounded-lg border border-border/40 italic">
                          "{report.description}"
                        </p>
                      )}

                      {report.evidence_images && report.evidence_images.length > 0 && (
                        <div className="flex gap-2 py-1">
                          {report.evidence_images.map((img: string, idx: number) => (
                            <div
                              key={idx}
                              className="h-16 w-16 rounded-lg overflow-hidden border border-border bg-muted cursor-zoom-in hover:opacity-80 transition-opacity shadow-sm"
                              onClick={() => setZoomedImage(img)}
                            >
                              <img src={getImageUrl(img)} alt="Evidence" className="h-full w-full object-cover" />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground font-medium">
                        <p>Bài viết: <span className="text-foreground/80 italic font-bold">"{report.post?.title || 'Bài đã mất/xoá'}"</span></p>
                        <p>Người tố cáo: <span className="text-foreground/80 font-bold">@{report.reporter?.username}</span></p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground hover:bg-muted border border-border"
                        onClick={() => setViewingReport(report)}
                      >
                        <FileText className="h-4 w-4 mr-1" /> Chi tiết
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary hover:bg-primary/10 border border-primary/20"
                        onClick={() => setViewingPost(report.post || null)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Xem bài
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-amber-500 hover:text-amber-600 hover:bg-amber-50 border border-amber-200"
                        onClick={() => handleReportAction(String(report._id || ''), 'warn_user')}
                      >
                        <AlertTriangle className="h-4 w-4 mr-1" /> Cảnh cáo
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-500 hover:text-green-600 hover:bg-green-50 border border-green-200"
                        onClick={() => handleReportAction(String(report._id || ''), 'dismiss')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Hủy báo cáo
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Detailed Report Modal */}
            <Dialog open={!!viewingReport} onOpenChange={(open) => !open && setViewingReport(null)}>
              <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
                <DialogHeader className="bg-muted/30 px-6 py-5 border-b border-border/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="destructive" className="text-[10px] h-5 font-black uppercase tracking-tighter">Báo cáo chi tiết</Badge>
                    <span className="text-xs text-muted-foreground font-medium">{viewingReport && new Date(viewingReport.created_at || 0).toLocaleString('vi-VN')}</span>
                  </div>
                  <DialogTitle className="text-xl font-black text-foreground">
                    {viewingReport?.reason}
                  </DialogTitle>
                  <DialogDescription className="sr-only">Nội dung chi tiết của báo cáo vi phạm cần duyệt.</DialogDescription>
                </DialogHeader>

                <div className="px-6 py-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  {/* People Section */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Người tố cáo</Label>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/40">
                        <Avatar className="h-8 w-8 border border-border/50">
                          <AvatarImage src={getImageUrl(viewingReport?.reporter?.avatar_url)} />
                          <AvatarFallback>{viewingReport?.reporter?.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">@{viewingReport?.reporter?.username}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{viewingReport?.reporter?.email}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Tác giả bài viết</Label>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/40 border border-border/40">
                        <Avatar className="h-8 w-8 border border-border/50">
                          <AvatarImage src={getImageUrl(viewingReport?.post?.author?.avatar_url)} />
                          <AvatarFallback>{viewingReport?.post?.author?.username?.[0]}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">@{viewingReport?.post?.author?.username}</p>
                          <p className="text-[10px] text-muted-foreground truncate">{viewingReport?.post?.author?.email}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Description Section */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nội dung giải trình vi phạm</Label>
                    <div className="p-4 rounded-2xl bg-red-50/30 border border-red-100/50 text-sm text-foreground/90 leading-relaxed italic">
                      {viewingReport?.description ? `"${viewingReport.description}"` : "Không có mô tả chi tiết kèm theo."}
                    </div>
                  </div>

                  {/* Evidence Section */}
                  {viewingReport?.evidence_images && viewingReport.evidence_images.length > 0 && (
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bằng chứng hình ảnh ({viewingReport.evidence_images.length})</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {viewingReport.evidence_images.map((img: string, idx: number) => (
                          <div
                            key={idx}
                            className="aspect-square rounded-2xl overflow-hidden border border-border bg-muted cursor-zoom-in group relative"
                            onClick={() => setZoomedImage(img)}
                          >
                            <img src={getImageUrl(img)} alt="Evidence" className="h-full w-full object-cover transition-transform group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Maximize2 className="h-5 w-5 text-white drop-shadow-md" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Post Context Section */}
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Bài viết bị tố cáo</Label>
                    <div className="p-4 rounded-2xl border border-border bg-card shadow-sm hover:border-primary/30 transition-colors cursor-pointer" onClick={() => { setViewingPost(viewingReport?.post || null); setViewingReport(null); }}>
                      <p className="font-black text-sm mb-1">{viewingReport?.post?.title}</p>
                      <div 
                        className="text-xs text-muted-foreground line-clamp-2 tiptap-prose"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingReport?.post?.content || '') }}
                      />
                      <div className="mt-3 flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 text-primary" />
                        <span className="text-[11px] font-bold text-primary uppercase tracking-tighter">Nhấn để xem toàn bộ bài viết</span>
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter className="bg-muted/10 px-6 py-4 border-t border-border/50 flex flex-wrap sm:justify-between items-center gap-3">
                  <Button variant="ghost" onClick={() => setViewingReport(null)} className="rounded-xl font-bold h-11">Đóng</Button>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="rounded-xl h-11 px-6 font-bold text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200"
                      onClick={() => { if (viewingReport?._id) handleReportAction(viewingReport._id, 'warn_user'); setViewingReport(null); }}
                    >
                      Cảnh cáo
                    </Button>
                    <Button
                      className="rounded-xl h-11 px-8 font-black bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20"
                      onClick={() => { if (viewingReport?._id) handleReportAction(viewingReport._id, 'dismiss'); setViewingReport(null); }}
                    >
                      Hủy báo cáo
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {activeTab === 'hidden' && (
              <div className="divide-y divide-border animate-in fade-in slide-in-from-top-1 duration-300">
                {hiddenPosts.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">Chưa có bài viết nào bị ẩn.</div>
                ) : hiddenPosts.map((post) => (
                  <div key={String(post._id || '')} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/30 transition-colors gap-3">
                    <div className="space-y-1 flex-1">
                      <p className="text-sm font-bold text-foreground truncate max-w-xl">{post.title}</p>
                      <p className="text-[11px] text-muted-foreground">Người đăng: @{post.author?.username}</p>
                      <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mt-1">Status: Hidden / Violated Policy</p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-primary hover:bg-primary/5 hover:text-primary border border-border/40"
                        onClick={() => setViewingPost(post)}
                      >
                        <Eye className="h-4 w-4 mr-1" /> Chi tiết
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-600 hover:bg-green-50 hover:text-green-700 border border-green-100"
                        onClick={() => handleRestorePost(String(post._id || ''))}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Khôi phục
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <div key={String(post._id || '')} className="p-4 flex flex-col md:flex-row md:items-start justify-between hover:bg-muted/30 transition-colors gap-3">
                  <div className="space-y-1 flex-1">
                    <p className="text-sm font-bold text-foreground">{post.title}</p>
                    <div 
                      className="text-xs text-muted-foreground line-clamp-2 tiptap-prose"
                      dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }}
                    />
                    <p className="text-xs text-muted-foreground/70 mt-2">Đăng bởi: <span className="font-semibold">@{post.author?.username}</span> • {formatDateTime(post.created_at)}</p>
                    {post.ai_system_note && (
                      <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-red-50 border border-red-100 text-red-600">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        <span className="text-[11px] font-bold uppercase tracking-wider">Robot cảnh báo: {post.ai_system_note}</span>
                      </div>
                    )}
                    {(post.image_url || post.video_url) && (
                      <div className="mt-2 flex items-center gap-2">
                        {post.image_url && (
                          <img
                            src={post.image_url.startsWith('http') ? post.image_url : `${API_BASE_URL}${post.image_url}`}
                            alt="Post content"
                            className="h-16 w-16 object-cover rounded-md border border-border"
                          />
                        )}
                        {post.video_url && (
                          <video
                            src={post.video_url.startsWith('http') ? post.video_url : `${API_BASE_URL}${post.video_url}`}
                            className="h-16 w-20 object-cover rounded-md border border-border bg-black"
                            muted
                            controls
                          />
                        )}
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
                      onClick={() => handlePostAction(String(post._id || ''), 'approve')}
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Duyệt bài
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePostAction(String(post._id || ''), 'reject')}
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
                  <div key={String(user._id || '')} className="p-4 flex flex-col md:flex-row md:items-center justify-between hover:bg-muted/30 transition-colors gap-3">
                    <div className="flex items-center gap-3 flex-1">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={getImageUrl(user.avatar_url)} />
                        <AvatarFallback>{getUserInitial(user.username)}</AvatarFallback>
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
                      onClick={() => handleUnlock(String(user._id || ''))}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mở khóa
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}


        {activeTab === 'communities' && (
          <div className="p-6 space-y-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Tag className="h-6 w-6 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Quản lý chủ đề bài viết</h3>
              </div>

              <Dialog open={isCreateTopicOpen} onOpenChange={setIsCreateTopicOpen}>
                <DialogTrigger asChild>
                  <Button className="shrink-0 gap-2">
                    <Plus className="h-4 w-4" /> Tạo chủ đề mới
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[500px]">
                  <DialogHeader>
                    <DialogTitle>Tạo chủ đề bài viết mới</DialogTitle>
                    <DialogDescription>
                      Thêm một phân loại mới để người dùng có thể chọn khi đăng bài.
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleCreateCommunity} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="comName">Tên chủ đề *</Label>
                      <Input id="comName" required placeholder="VD: Công nghệ, Học tập, Giải trí..." value={comFormData.name} onChange={e => setComFormData({ ...comFormData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comDesc">Mô tả chủ đề</Label>
                      <textarea id="comDesc" className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 transition-all outline-none" placeholder="Giới thiệu ngắn gọn về chủ đề này..." value={comFormData.description} onChange={e => setComFormData({ ...comFormData, description: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="comIcon">Biểu tượng (Emoji)</Label>
                      <Input id="comIcon" placeholder="📚, 🎮, 🎨..." value={comFormData.icon} onChange={e => setComFormData({ ...comFormData, icon: e.target.value })} />
                    </div>
                    <Button type="submit" className="w-full mt-4">Tạo Chủ Đề Ngay</Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Edit Topic Dialog */}
            <Dialog open={isEditTopicOpen} onOpenChange={setIsEditTopicOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Chỉnh sửa chủ đề</DialogTitle>
                  <DialogDescription>
                    Cập nhật thông tin cho chủ đề bài viết.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleUpdateTopic} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="editComName">Tên chủ đề *</Label>
                    <Input id="editComName" required value={editTopicFormData.name} onChange={e => setEditTopicFormData({ ...editTopicFormData, name: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editComDesc">Mô tả chủ đề</Label>
                    <textarea id="editComDesc" className="flex min-h-[100px] w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 transition-all outline-none" value={editTopicFormData.description} onChange={e => setEditTopicFormData({ ...editTopicFormData, description: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editComIcon">Biểu tượng (Emoji)</Label>
                    <Input id="editComIcon" value={editTopicFormData.icon} onChange={e => setEditTopicFormData({ ...editTopicFormData, icon: e.target.value })} />
                  </div>
                  <Button type="submit" className="w-full mt-4">Lưu thay đổi</Button>
                </form>
              </DialogContent>
            </Dialog>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  Danh sách chủ đề hiện có
                  <Badge variant="secondary" className="ml-2 font-black">{communities.length}</Badge>
                </h3>
              </div>

              <div className="border rounded-xl overflow-hidden shadow-sm bg-card">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-6 py-4">Chủ đề</th>
                      <th className="px-6 py-4">Số bài viết</th>
                      <th className="px-6 py-4 hidden md:table-cell">Mô tả</th>
                      <th className="px-6 py-4 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {communities.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground italic">
                          Chưa có chủ đề nào được tạo.
                        </td>
                      </tr>
                    ) : communities.map((com) => (
                      <tr key={String(com._id || '')} className="hover:bg-muted/20 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-xl shadow-inner shrink-0 group-hover:scale-110 transition-transform">
                              {com.icon || '👥'}
                            </div>
                            <div className="min-w-0">
                              <p className="font-black text-foreground truncate">{com.name}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Topic ID: {String(com._id || '').slice(-6) || 'N/A'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge variant="outline" className="font-bold border-primary/20 text-primary">
                            {com.postCount || 0} bài viết
                          </Badge>
                        </td>
                        <td className="px-6 py-4 hidden md:table-cell">
                          <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{com.description || 'Không có mô tả'}</p>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                             <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 p-2 hover:bg-primary/10 hover:text-primary rounded-lg flex items-center gap-2 group-hover:bg-primary/5"
                              onClick={() => com.name && fetchCommunityPosts(com.name)}
                              disabled={!com.name}
                            >
                              <Eye className="h-4 w-4" />
                              <span className="text-[11px] font-bold uppercase tracking-wider">Xem bài viết</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary rounded-lg"
                              onClick={() => openEditTopicDialog(com)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-9 w-9 p-0 hover:bg-red-500/10 hover:text-red-500 rounded-lg"
                              onClick={() => com._id && handleDeleteCommunity(com._id)}
                              disabled={!com._id}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <div key={String(feedback._id || '')} className={`p-4 flex flex-col md:flex-row md:items-start justify-between hover:bg-muted/30 transition-colors gap-4 ${feedback.status === 'new' ? 'bg-primary/5' : ''}`}>
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
                      <span className="text-xs text-muted-foreground">{formatDateTime(feedback.created_at)}</span>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed">{feedback.content}</p>
                    <div className="flex items-center gap-2 mt-3 p-2 rounded-lg bg-muted/50 w-fit">
                      <img src={getImageUrl(feedback.user?.avatar_url)} alt="Avatar" className="h-6 w-6 rounded-full border border-border" />
                      <span className="text-xs font-medium text-muted-foreground">@{feedback.user?.username || 'unknown'} ({feedback.user?.full_name || 'N/A'})</span>
                    </div>
                  </div>
                  {feedback.status === 'new' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => feedback._id && handleFeedbackAction(feedback._id)}
                      disabled={!feedback._id}
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
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="password">Mật khẩu *</Label>
                          <Input id="password" type="password" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="full_name">Người Dùng</Label>
                          <Input id="full_name" value={formData.full_name} onChange={e => setFormData({ ...formData, full_name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="role">Vai trò</Label>
                          <select id="role" className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 transition-all outline-none" value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })}>
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                          </select>
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
                        <div className="space-y-2 col-span-2">
                          <Label htmlFor="edit-password">Mật khẩu mới (Để trống nếu giữ nguyên)</Label>
                          <Input id="edit-password" type="password" placeholder="••••••••" value={editFormData.password} onChange={e => setEditFormData({ ...editFormData, password: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-full_name">Người Dùng</Label>
                          <Input id="edit-full_name" value={editFormData.full_name} onChange={e => setEditFormData({ ...editFormData, full_name: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-role">Vai trò</Label>
                          <select id="edit-role" className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus-visible:ring-2 focus-visible:ring-primary/20 transition-all outline-none" value={editFormData.role} onChange={e => setEditFormData({ ...editFormData, role: e.target.value })}>
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                          </select>
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
                  placeholder="Tìm tài khoản, email, tên..."
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
                      <th className="px-4 py-3 hidden md:table-cell">Email</th>
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
                      <tr key={String(user._id || '')} className="hover:bg-muted/30 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarImage src={getImageUrl(user.avatar_url)} />
                              <AvatarFallback>{getUserInitial(user.username)}</AvatarFallback>
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
                        </td>
                        <td className="px-4 py-3 text-center">
                          <Badge variant="outline" className={user.role?.toLowerCase() === 'admin' ? 'border-primary text-primary bg-primary/5' : ''}>
                            {user.role}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                              onClick={() => openEditDialog(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 hover:bg-red-500/10 hover:text-red-500 text-red-500/70"
                              onClick={() => user._id && handleDeleteUser(user._id)}
                              disabled={!user._id}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
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

      {/* Dialog chi tiết bài đăng — Khung Vừa Phải & Chuyên nghiệp (Balanced Modal) */}
      <Dialog open={!!viewingPost} onOpenChange={(open) => !open && setViewingPost(null)}>
        <DialogContent className="max-w-5xl w-[94vw] h-[90vh] p-0 border-none shadow-2xl bg-background rounded-3xl overflow-hidden flex flex-col z-[100] [&>button]:hidden">
          <DialogTitle className="sr-only">Chi tiết bài viết</DialogTitle>
          <DialogDescription className="sr-only">Mô tả và nội dung của bài viết đang được xem.</DialogDescription>
          {/* Header */}
          <div className="flex-shrink-0 h-16 bg-muted/40 border-b border-border/80 px-8 flex items-center justify-between sticky top-0 z-50 backdrop-blur-md">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="text-[10px] font-black tracking-widest uppercase py-1 px-3 rounded-full border-primary/30 text-primary bg-primary/5">
                Moderation Context
              </Badge>
              {viewingPost?.community && (
                <span className="text-xs font-black text-muted-foreground uppercase tracking-widest opacity-40">in {viewingPost.community}</span>
              )}
            </div>
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-red-500/10 hover:text-red-500" onClick={() => setViewingPost(null)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto bg-background/50 custom-scrollbar">
            <div className="max-w-3xl mx-auto px-6 py-12 space-y-12">
              <header className="space-y-6 text-center">
                <h2 className="text-4xl font-black tracking-tighter text-foreground leading-[1.1]">
                  {viewingPost?.title}
                </h2>
                <div className="flex items-center justify-center gap-4 text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-50">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{viewingPost ? formatDateTime(viewingPost.created_at) : 'N/A'}</span>
                </div>
                <div className="h-1 w-20 bg-primary/20 mx-auto rounded-full"></div>
              </header>

              <div className="space-y-10">
                <div 
                  className="text-foreground font-medium leading-[1.7] whitespace-pre-wrap select-text tiptap-prose content-zoom text-lg"
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingPost?.content || '') }}
                />

                {/* Media Section */}
                {((viewingPost?.image_urls?.length ?? 0) > 0 || viewingPost?.image_url || viewingPost?.video_url) && (
                  <div className="pt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingPost?.image_urls?.map((url: string, i: number) => (
                      <div key={i} className="group relative rounded-2xl overflow-hidden border border-border shadow-sm aspect-square bg-muted/20">
                        <img
                          src={getImageUrl(url)}
                          className="w-full h-full object-cover cursor-zoom-in transition-transform duration-700 group-hover:scale-105"
                          alt={`Attached Asset ${i + 1}`}
                          onClick={() => setZoomedImage(getImageUrl(url))}
                        />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                          <Maximize2 className="h-8 w-8 text-white drop-shadow-lg" />
                        </div>
                      </div>
                    ))}
                    {(!viewingPost?.image_urls || viewingPost.image_urls.length === 0) && viewingPost?.image_url && (
                      <div className="rounded-3xl overflow-hidden border border-border shadow-sm col-span-full group relative bg-muted/20">
                        <img
                          src={getImageUrl(viewingPost.image_url)}
                          className="w-full h-auto object-cover max-h-[800px] cursor-zoom-in group-hover:opacity-95 transition-opacity"
                          alt="Main Post Media"
                          onClick={() => setZoomedImage(getImageUrl(viewingPost.image_url))}
                        />
                      </div>
                    )}
                    {viewingPost?.video_url && (
                      <div className="rounded-3xl overflow-hidden border border-border shadow-sm col-span-full bg-black/90 p-2">
                        <video
                          src={getImageUrl(viewingPost.video_url)}
                          controls
                          className="w-full max-h-[720px] rounded-2xl bg-black"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Center - Fixed Footer */}
          <div className="flex-shrink-0 h-24 bg-background border-t border-border px-10 flex items-center justify-between z-50">
            <div className="flex items-center gap-4">
              <Avatar className="h-12 w-12 border-2 border-border shadow-md">
                <AvatarImage src={getImageUrl(viewingPost?.author?.avatar_url)} className="object-cover" />
                <AvatarFallback className="font-bold">{viewingPost?.author?.username?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-black italic">@{viewingPost?.author?.username}</span>
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Poster Identity</span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {activeTab === 'posts' && (
                <>
                  <Button
                    className="bg-green-600 hover:bg-green-700 text-white font-black h-12 px-8 rounded-2xl shadow-xl shadow-green-500/20 gap-2 transition-all active:scale-95"
                    onClick={() => {
                      if (!viewingPost?._id) return;
                      handlePostAction(viewingPost._id, 'approve');
                      setViewingPost(null);
                    }}
                  >
                    <CheckCircle2 className="h-5 w-5" /> DUYỆT BÀI
                  </Button>
                  <Button
                    variant="outline"
                    className="border-red-200 text-red-500 hover:bg-red-50 font-black h-12 px-8 rounded-2xl transition-all"
                    onClick={() => {
                      if (!viewingPost?._id) return;
                      handlePostAction(viewingPost._id, 'reject');
                      setViewingPost(null);
                    }}
                  >
                    <XCircle className="h-5 w-5 mr-2" /> TỪ CHỐI
                  </Button>
                </>
              )}
              {(activeTab === 'reports' || activeTab === 'hidden') && (
                <Button
                  className="bg-primary hover:bg-primary/90 text-white font-black h-12 px-8 rounded-2xl"
                  onClick={() => setViewingPost(null)}
                >
                  ĐÓNG XEM TRƯỚC
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>



      {/* GIAO DIỆN: DIALOG HIỂN THỊ DANH SÁCH BÀI VIẾT THEO CHỦ ĐỀ */}
      <Dialog open={isViewCommPostsOpen} onOpenChange={setIsViewCommPostsOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="bg-muted/30 px-6 py-5 border-b border-border/50 shrink-0">
             <div className="flex items-center justify-between">
                <div>
                   {/* Tiêu đề Dialog hiển thị tên chủ đề đang xem */}
                  <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2 uppercase tracking-tight">
                    <Tag className="h-5 w-5 text-primary" />
                    Chủ đề: {activeCommName}
                  </DialogTitle>
                  <DialogDescription>
                    Danh sách tất cả bài viết thuộc chủ đề này
                  </DialogDescription>
                </div>
                <Badge variant="outline" className="font-bold border-primary/20 text-primary h-7 px-3">
                  {selectedCommPosts.length} bài viết
                </Badge>
             </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-background">
            {loadingCommPosts ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-muted-foreground font-medium">Đang tải danh sách bài viết...</p>
              </div>
            ) : selectedCommPosts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
                <FileText className="h-12 w-12 text-muted-foreground/20" />
                <div>
                  <h4 className="font-bold text-foreground">Chưa có bài viết nào</h4>
                  <p className="text-sm text-muted-foreground">Chủ đề này hiện đang trống.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {selectedCommPosts.map((post) => (
                  <Card key={String(post._id || '')} className="p-4 hover:bg-muted/30 transition-colors border-border/50 group">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1 min-w-0 space-y-2">
                        <div className="flex items-center gap-2">
                           <Badge variant="outline" className={`text-[10px] font-black uppercase px-2 py-0 h-5 border-none ${
                             post.status === 'approved' ? 'bg-green-100 text-green-700' :
                             post.status === 'pending' ? 'bg-amber-100 text-amber-700' :
                             post.status === 'rejected' ? 'bg-red-100 text-red-700' :
                             'bg-slate-100 text-slate-700'
                           }`}>
                             {post.status === 'approved' ? 'Đã đăng' :
                              post.status === 'pending' ? 'Chờ duyệt' :
                              post.status === 'rejected' ? 'Từ chối' :
                              'Bị ẩn'}
                           </Badge>
                           <h4 className="font-bold text-sm text-foreground truncate">{post.title}</h4>
                        </div>
                        <div 
                          className="text-xs text-muted-foreground line-clamp-2 leading-relaxed tiptap-prose"
                          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.content || '') }}
                        />
                        <div className="flex items-center gap-3 text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
                           <span className="flex items-center gap-1"><Users className="h-3 w-3" /> @{post.author?.username}</span>
                           <span>• {formatDateTime(post.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0 md:self-center">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 px-3 rounded-lg hover:bg-primary/10 text-primary font-bold text-[11px] uppercase tracking-wider border border-primary/10"
                          onClick={() => setViewingPost(post)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> Chi tiết
                        </Button>

                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div className="p-4 border-t border-border shrink-0 bg-muted/20">
             <Button variant="outline" className="w-full rounded-xl font-bold" onClick={() => setIsViewCommPostsOpen(false)}>Đóng danh sách</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Zoom Modal */}
      <Dialog open={!!zoomedImage} onOpenChange={(open) => !open && setZoomedImage(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 border-none bg-black/95 flex items-center justify-center z-[200] rounded-none overflow-hidden [&>button]:hidden">
          <DialogTitle className="sr-only">Phóng to ảnh</DialogTitle>
          <DialogDescription className="sr-only">Tùy biến hiển thị kích thước lớn của ảnh được chọn.</DialogDescription>
          <div className="relative w-full h-full flex items-center justify-center p-4">
            {zoomedImage && (
              <img src={getImageUrl(zoomedImage)} alt="Zoomed view" className="max-w-full max-h-full object-contain shadow-2xl animate-in zoom-in-95 duration-200" onClick={() => setZoomedImage(null)} />
            )}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 text-white/50 hover:bg-white/10 hover:text-white transition-all"
              onClick={() => setZoomedImage(null)}
            >
              <X className="h-6 w-6" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}





