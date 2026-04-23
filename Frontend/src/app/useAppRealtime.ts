import { useEffect, useRef } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';
import { useSocket } from '@/contexts/SocketContext';
import type { AppUser as User } from '@/types/user';
import { normalizeEntityId } from './app-auth';

type NotificationSocketPayload = {
  type?: string;
  senderName?: string;
  content?: string;
};

type MessageSocketPayload = {
  _id?: string;
  conversation?: string | { _id?: string };
  sender?: unknown;
  recipient?: unknown;
  content?: string;
};

interface UseAppRealtimeParams {
  currentUser: User;
  setUnreadNotifications: React.Dispatch<React.SetStateAction<number>>;
  setUnreadMessagesCount: React.Dispatch<React.SetStateAction<number>>;
  fetchUnreadMessagesCount: (userId: string) => Promise<void>;
  navigate: NavigateFunction;
}

export function useAppRealtime({
  currentUser,
  setUnreadNotifications,
  setUnreadMessagesCount,
  fetchUnreadMessagesCount,
  navigate
}: UseAppRealtimeParams) {
  const { socket, isConnected } = useSocket();

  const userIdRef = useRef<string>('');
  useEffect(() => {
    userIdRef.current = normalizeEntityId(currentUser.id || currentUser._id);
  }, [currentUser]);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleNewNotification = (data: NotificationSocketPayload) => {
      setUnreadNotifications((prev) => prev + 1);
      if (!('Notification' in window) || Notification.permission !== 'granted') return;

      const currentPrefs = currentUser?.preferences;
      let shouldNotify = false;
      if (data.type === 'like' && currentPrefs?.pushNotifications !== false) shouldNotify = true;
      if (data.type === 'comment' && currentPrefs?.commentNotifications !== false) shouldNotify = true;
      if (data.type === 'mention') shouldNotify = true;
      if (data.type === 'friend_request') shouldNotify = true;
      if (data.type === 'system') shouldNotify = true;
      if (!shouldNotify) return;

      const titleMap: Record<string, string> = {
        friend_request: 'Loi moi ket ban',
        like: 'Thich bai viet',
        comment: 'Binh luan moi',
        mention: 'Ban duoc nhac ten',
        system: 'Thong bao he thong'
      };
      const title = titleMap[data.type || ''] || 'Thong bao moi';
      const senderName = data.senderName || 'Ai do';
      const body = data.type === 'friend_request'
        ? `${senderName} da gui loi moi ket ban`
        : (data.type === 'system' ? (data.content || '') : `${senderName} da tuong tac voi ban`);

      new window.Notification(title, { body });
    };

    const handleReceiveMessage = (message: MessageSocketPayload) => {
      const currentId = userIdRef.current;
      const recipientId = normalizeEntityId(message.recipient);
      const senderId = normalizeEntityId(message.sender);
      const isIncomingForCurrentUser = recipientId === currentId && senderId !== currentId;

      if (currentId && recipientId === currentId) {
        const isMessagesPageRoute = window.location.pathname === '/messages' || window.location.pathname.startsWith('/messages/');
        if (!isMessagesPageRoute && isIncomingForCurrentUser) {
          setUnreadMessagesCount((prev) => prev + 1);
        }
        void fetchUnreadMessagesCount(currentId);
      }

      const isMessagesPage = window.location.pathname === '/messages' || window.location.pathname.startsWith('/messages/');
      if (isMessagesPage || !isIncomingForCurrentUser) return;

      toast('Tin nhan moi', {
        description: message.content || '[Tep dinh kem]',
        action: {
          label: 'Xem',
          onClick: () => navigate('/messages')
        }
      });
    };

    socket.on('new_notification', handleNewNotification);
    socket.on('receive_message', handleReceiveMessage);
    socket.on('notification_cancelled', () => {
      setUnreadNotifications((prev) => Math.max(0, prev - 1));
    });

    return () => {
      socket.off('new_notification', handleNewNotification);
      socket.off('receive_message', handleReceiveMessage);
      socket.off('notification_cancelled');
    };
  }, [
    socket,
    isConnected,
    currentUser?.preferences,
    navigate,
    fetchUnreadMessagesCount,
    setUnreadMessagesCount,
    setUnreadNotifications
  ]);
}
