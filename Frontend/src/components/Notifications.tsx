import { useEffect, useState } from 'react';
import { Heart, MessageCircle, UserPlus, TrendingUp, AlertTriangle, ShieldCheck, MessageSquare, UserCheck } from 'lucide-react';
import { API_URL } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Socket } from 'socket.io-client';

const getIcon = (type: string) => {
  switch (type) {
    case 'like':
    case 'upvote':
      return <Heart className="h-5 w-5 text-primary" />;
    case 'comment':
      return <MessageCircle className="h-5 w-5 text-blue-500" />;
    case 'friend_request':
      return <UserPlus className="h-5 w-5 text-green-500" />;
    case 'follow':
      return <UserCheck className="h-5 w-5 text-red-500" />;
    case 'trending':
      return <TrendingUp className="h-5 w-5 text-amber-500" />;
    case 'system':
      return <ShieldCheck className="h-5 w-5 text-red-600" />;
    case 'mention':
      return <MessageSquare className="h-5 w-5 text-purple-500" />;
    default:
      return null;
  }
};

export function Notifications({ currentUser, socket, onMarkAllAsRead }: { currentUser?: any, socket?: Socket | null, onMarkAllAsRead?: () => void }) {
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
     if (currentUser?.id) {
       fetch(`${API_URL}/notifications?accountId=${currentUser.id}`)
         .then(res => res.json())
         .then(data => {
            if (data.status === 'success') {
               setNotifications(data.data);
            }
         });
     }
  }, [currentUser]);

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
      console.log('🔔 Nhận thông báo mới qua socket:', data);
      // Giả lập format giống DB để render
      const newNotif = {
        _id: data.id || Date.now().toString(),
        type: data.type,
        content: data.content,
        sender: data.sender || { username: data.senderName, avatar_url: '' },
        post: data.postTitle ? { title: data.postTitle } : null,
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
     if (!currentUser?.id) return;
     try {
       await fetch(`${API_URL}/notifications/read-all`, {
         method: 'PUT',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ accountId: currentUser.id })
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
       await fetch(`${API_URL}/notifications/${id}/read`, { method: 'PUT' });
       setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
     } catch (e) {}
  };

  const handleFriendAction = async (notifId: string, senderId: string, action: 'accept' | 'reject') => {
    try {
      const endpoint = action === 'accept' ? 'accept' : 'reject';
      const res = await fetch(`${API_URL}/auth/friends/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, senderId })
      });
      if (res.ok) {
        toast.success(action === 'accept' ? 'Đã chấp nhận kết bạn!' : 'Đã từ chối lời mời.');
        // Đánh dấu đã đọc và xóa hoặc cập nhật UI
        setNotifications(prev => prev.filter(n => n._id !== notifId));
      }
    } catch (e) {
      toast.error('Lỗi khi thực hiện thao tác');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-2xl font-bold text-foreground">Thông báo</h1>
          <p className="text-muted-foreground">Cập nhật mới nhất về hoạt động của bạn</p>
        </div>
        <Button variant="outline" className="border-border hover:bg-muted text-muted-foreground hover:text-foreground" onClick={handleMarkAllAsRead}>
          Đánh dấu đã đọc tất cả
        </Button>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 && (
          <Card className="border-border bg-muted p-6 text-center">
            <p className="text-muted-foreground">Hiện chưa có thông báo nào!</p>
          </Card>
        )}
        {notifications.map((notification) => (
          <Card
            key={notification._id}
            onClick={() => handleMarkAsRead(notification._id, notification.isRead)}
            className={`border-border p-4 transition-colors hover:shadow-md cursor-pointer ${
              !notification.isRead ? 'bg-primary/5' : 'bg-card'
            }`}
          >
            <div className="flex gap-3">
              <div className="relative">
                 <Avatar className="h-12 w-12 border-2 border-border">
                   <AvatarImage src={notification.sender?.avatar_url} />
                   <AvatarFallback className="bg-muted text-muted-foreground">{notification.sender?.display_name?.[0] || notification.sender?.username?.[0] || 'U'}</AvatarFallback>
                 </Avatar>
                <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-background shadow-sm border border-border">
                  {getIcon(notification.type)}
                </div>
              </div>

               <div className="flex-1">
                <div className="mb-1">
                  <span className="font-medium text-foreground">{notification.sender?.display_name || notification.sender?.username}</span>
                  <span className="text-muted-foreground">
                    {notification.type === 'like' && ' đã thích bài viết của bạn'}
                    {notification.type === 'comment' && ' đã bình luận về bài viết'}
                    {notification.type === 'mention' && ' đã nhắc đến bạn trong một bình luận'}
                    {notification.type === 'friend_request' && ' đã gửi cho bạn một lời mời kết bạn'}
                    {notification.type === 'follow' && ' đã bắt đầu theo dõi bạn'}
                    {notification.type === 'system' && ' (Thông báo hệ thống)'}
                  </span>
                  {notification.post && <span className="font-semibold text-foreground"> "{notification.post?.title}"</span>}
                </div>
                {(notification.type === 'comment' || notification.type === 'mention' || notification.type === 'system') && notification.content && (
                   <p className="text-sm italic text-muted-foreground mb-1">"{notification.content}"</p>
                )}
                
                {notification.type === 'friend_request' && !notification.isRead && (
                   <div className="mt-3 flex gap-2">
                      <Button 
                        size="sm" 
                        className="h-8 bg-green-600 hover:bg-green-700 text-white"
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
                        className="h-8 border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFriendAction(notification._id, notification.sender?._id, 'reject');
                        }}
                      >
                        Từ chối
                      </Button>
                   </div>
                )}
                 <div className="mt-1 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground capitalize">
                      {notification.type === 'friend_request' ? 'Kết bạn' : 
                       (notification.type === 'follow' ? 'Theo dõi' :
                       (notification.type === 'like' ? 'Tương tác' : 
                       (notification.type === 'mention' ? 'Nhắc tên' : 'Thảo luận')))}
                    </span>
                   <span className="text-border">•</span>
                   <span className="text-xs text-muted-foreground">{new Date(notification.created_at).toLocaleString('vi-VN')}</span>
                </div>
              </div>

              {!notification.isRead && (
                <div className="h-2 w-2 flex-shrink-0 rounded-full bg-primary mt-2"></div>
              )}
            </div>
          </Card>
        ))}
      </div>


      <Card className="border-border bg-muted p-6 text-center">
        <p className="text-muted-foreground">Bạn đã xem hết tất cả thông báo!</p>
      </Card>
    </div>
  );
}
