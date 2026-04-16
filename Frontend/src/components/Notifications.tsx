import { useEffect, useState } from 'react';
import { Heart, MessageCircle, UserPlus, TrendingUp, ShieldCheck, MessageSquare, UserCheck, BellRing } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useSocket } from '@/contexts/SocketContext';

const getIcon = (type: string) => {
  switch (type) {
    case 'like':
    case 'upvote':
      return <Heart className="h-4 w-4 text-primary" />;
    case 'comment':
      return <MessageCircle className="h-4 w-4 text-blue-500" />;
    case 'friend_request':
      return <UserPlus className="h-4 w-4 text-green-500" />;
    case 'follow':
      return <UserCheck className="h-4 w-4 text-red-500" />;
    case 'trending':
      return <TrendingUp className="h-4 w-4 text-amber-500" />;
    case 'system':
      return <ShieldCheck className="h-4 w-4 text-red-600" />;
    case 'mention':
      return <MessageSquare className="h-4 w-4 text-secondary" />;
    default:
      return <BellRing className="h-4 w-4 text-primary" />;
  }
};

const getCategoryLabel = (type: string) => {
  if (type === 'friend_request') return 'Kết bạn';
  if (type === 'follow') return 'Theo dõi';
  if (type === 'like') return 'Tương tác';
  if (type === 'mention') return 'Nhắc tên';
  return 'Thảo luận';
};

export function Notifications({
  currentUser,
  onMarkAllAsRead,
  onNotificationClick
}: {
  currentUser?: any,
  onMarkAllAsRead?: () => void,
  onNotificationClick?: (notification: any) => void
}) {
  const { socket } = useSocket();
  const [notifications, setNotifications] = useState<any[]>([]);
  const currentUserId = currentUser?.id || currentUser?._id;
  const [filter, setFilter] = useState<'all' | 'unread' | 'social' | 'content'>('all');

  const getAuthHeaders = (includeJson = false) => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = {};
    if (includeJson) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  };

  useEffect(() => {
    if (currentUserId) {
      fetch(`${API_URL}/notifications?accountId=${currentUserId}`, {
        cache: 'no-store',
        headers: getAuthHeaders(false)
      })
        .then(res => res.ok ? res.json() : Promise.reject(new Error('Fetch notifications failed')))
        .then(data => {
          if (data.status === 'success') {
            setNotifications(data.data);
          }
        })
        .catch(() => setNotifications([]));
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!socket) return;

    const handler = (data: any) => {
      if (data.type === 'friend_request') {
        setNotifications((prev: any[]) => prev.filter((n: any) =>
          !(n.type === 'friend_request' && n.sender?._id === data.senderId)
        ));
      }
    };

    socket.on('notification_cancelled', handler);

    const newNotificationHandler = (data: any) => {
      const newNotif = {
        _id: data.id || Date.now().toString(),
        type: data.type,
        content: data.content,
        sender: data.sender || { username: data.senderName, avatar_url: '' },
        post: data.postId ? { _id: data.postId, title: data.postTitle || data.title || 'Bài viết' } : null,
        isRead: false,
        created_at: data.created_at || new Date().toISOString()
      };
      setNotifications(prev => [newNotif, ...prev]);
      toast.info(`Bạn có thông báo mới: ${data.type}`);
    };

    socket.on('new_notification', newNotificationHandler);

    return () => {
      socket.off('notification_cancelled', handler);
      socket.off('new_notification', newNotificationHandler);
    };
  }, [socket]);

  const handleMarkAllAsRead = async () => {
    if (!currentUserId) return;
    try {
      await fetch(`${API_URL}/notifications/read-all`, {
        method: 'PUT',
        headers: getAuthHeaders(true),
        body: JSON.stringify({})
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      if (onMarkAllAsRead) onMarkAllAsRead();
      toast.success('Đã đánh dấu tất cả là đã đọc');
    } catch (e) {
      toast.error('Lỗi khi đánh dấu đã đọc');
    }
  };

  const handleMarkAsRead = async (id: string, isRead: boolean) => {
    if (isRead) return;
    try {
      await fetch(`${API_URL}/notifications/${id}/read`, {
        method: 'PUT',
        headers: getAuthHeaders(false)
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (e) {}
  };

  const handleFriendAction = async (notifId: string, senderId: string, action: 'accept' | 'reject') => {
    try {
      const endpoint = action === 'accept' ? 'accept' : 'reject';
      const res = await fetch(`${API_URL}/auth/friends/${endpoint}`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify({ userId: currentUserId, senderId })
      });
      if (res.ok) {
        toast.success(action === 'accept' ? 'Đã chấp nhận kết bạn' : 'Đã từ chối lời mời');
        setNotifications(prev => prev.filter(n => n._id !== notifId));
      }
    } catch (e) {
      toast.error('Lỗi khi thực hiện thao tác');
    }
  };

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === 'unread') return !notification.isRead;
    if (filter === 'social') return ['friend_request', 'follow'].includes(notification.type);
    if (filter === 'content') return !['friend_request', 'follow'].includes(notification.type);
    return true;
  });

  const unreadCount = notifications.filter(notification => !notification.isRead).length;

  return (
    <div className="space-y-6">
      <section className="page-hero px-5 py-6 sm:px-7 sm:py-7">
        <div className="relative z-[1] flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="page-soft-surface mb-3 inline-flex items-center rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.24em] text-primary">
              Activity Center
            </div>
            <h1 className="text-2xl font-black tracking-tight text-foreground sm:text-4xl">Thông báo được nhóm lại gọn gàng và dễ quét.</h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              Tập trung vào những tương tác mới nhất, tách rõ kết nối và nội dung để bạn xử lý nhanh hơn.
            </p>
          </div>
          <div className="page-stat-grid w-full max-w-xl">
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Tổng</div>
              <div className="mt-2 text-2xl font-black text-foreground">{notifications.length}</div>
              <div className="mt-1 text-sm text-muted-foreground">Thông báo</div>
            </div>
            <div className="page-stat-card">
              <div className="text-xs font-black uppercase tracking-[0.24em] text-muted-foreground">Chưa đọc</div>
              <div className="mt-2 text-2xl font-black text-foreground">{unreadCount}</div>
              <div className="mt-1 text-sm text-muted-foreground">Cần xử lý</div>
            </div>
          </div>
        </div>
      </section>

      <Card className="page-section-card p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'unread', label: 'Chưa đọc' },
              { id: 'social', label: 'Kết nối' },
              { id: 'content', label: 'Nội dung' }
            ].map((item) => (
              <Button
                key={item.id}
                variant={filter === item.id ? 'default' : 'outline'}
                size="sm"
                className="rounded-full"
                onClick={() => setFilter(item.id as 'all' | 'unread' | 'social' | 'content')}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <Button variant="outline" className="rounded-full border-border hover:bg-muted" onClick={handleMarkAllAsRead}>
            Đánh dấu đã đọc tất cả
          </Button>
        </div>
      </Card>

      <div className="space-y-4">
        {notifications.length === 0 && (
          <Card className="page-empty p-10 text-center">
            <p className="text-lg font-bold text-foreground">Hiện chưa có thông báo nào</p>
            <p className="mt-2 text-sm text-muted-foreground">Khi có ai đó tương tác với bạn, mọi cập nhật sẽ hiện ở đây.</p>
          </Card>
        )}

        {notifications.length > 0 && filteredNotifications.length === 0 && (
          <Card className="page-empty p-10 text-center">
            <p className="text-lg font-bold text-foreground">Không có thông báo phù hợp</p>
            <p className="mt-2 text-sm text-muted-foreground">Thử đổi bộ lọc để xem thêm hoạt động.</p>
          </Card>
        )}

        {filteredNotifications.map((notification) => (
          <Card
            key={notification._id}
            onClick={() => {
              handleMarkAsRead(notification._id, notification.isRead);
              if (onNotificationClick) onNotificationClick(notification);
            }}
            className={`page-section-card cursor-pointer p-4 transition-all hover:-translate-y-0.5 hover:shadow-lg ${!notification.isRead ? 'border-primary/20 bg-primary/5' : ''}`}
          >
            <div className="flex gap-4">
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                  <AvatarImage src={notification.sender?.avatar_url} />
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    {notification.sender?.full_name?.[0] || notification.sender?.username?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background shadow-sm">
                  {getIcon(notification.type)}
                </div>
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 text-sm leading-6 text-foreground">
                  <span className="font-bold">{notification.sender?.full_name || notification.sender?.username}</span>
                  <span className="text-muted-foreground">
                    {notification.type === 'like' && ' đã thích bài viết của bạn'}
                    {notification.type === 'comment' && ' đã bình luận về bài viết'}
                    {notification.type === 'mention' && ' đã nhắc đến bạn trong một bình luận'}
                    {notification.type === 'friend_request' && ' đã gửi cho bạn một lời mời kết bạn'}
                    {notification.type === 'follow' && ' đã bắt đầu theo dõi bạn'}
                    {notification.type === 'system' && ' gửi thông báo hệ thống'}
                  </span>
                  {notification.post && <span className="font-semibold text-foreground"> "{notification.post?.title}"</span>}
                </div>

                {(notification.type === 'comment' || notification.type === 'mention' || notification.type === 'system') && notification.content && (
                  <p className="mb-2 rounded-2xl bg-muted/70 px-3 py-2 text-sm italic text-muted-foreground">
                    "{notification.content}"
                  </p>
                )}

                {notification.type === 'friend_request' && !notification.isRead && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      size="sm"
                      className="h-9 rounded-full bg-green-600 px-4 text-white hover:bg-green-700"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFriendAction(notification._id, notification.sender?._id, 'accept');
                      }}
                    >
                      Đồng ý
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 rounded-full"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFriendAction(notification._id, notification.sender?._id, 'reject');
                      }}
                    >
                      Từ chối
                    </Button>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="rounded-full bg-muted px-2.5 py-1 font-semibold text-foreground/80">{getCategoryLabel(notification.type)}</span>
                  <span>•</span>
                  <span>{new Date(notification.created_at).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {!notification.isRead && (
                <div className="mt-2 h-2.5 w-2.5 flex-shrink-0 rounded-full bg-primary shadow-[0_0_0_6px_rgba(201,31,40,0.08)]" />
              )}
            </div>
          </Card>
        ))}

        {notifications.length > 0 && notifications.every(notification => notification.isRead) && (
          <Card className="page-empty p-8 text-center">
            <p className="text-lg font-bold text-foreground">Bạn đã xem hết thông báo</p>
            <p className="mt-2 text-sm text-muted-foreground">Có hoạt động mới, danh sách sẽ tự động cập nhật.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
