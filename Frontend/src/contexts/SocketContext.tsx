import React, { createContext, useContext, useEffect, useRef, useState, ReactNode, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/lib/api';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUserIds: string[];
  registerUser: (userId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
  userId?: string | null;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children, userId }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const lastRegisteredUserIdRef = useRef<string>('');

  const resolveCurrentUserId = useCallback(() => {
    const propUserId = userId ? String(userId) : '';
    if (propUserId) return propUserId;

    try {
      const savedUserStr = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser');
      if (!savedUserStr) return '';
      const savedUser = JSON.parse(savedUserStr);
      return String(savedUser?._id || savedUser?.id || '');
    } catch {
      return '';
    }
  }, [userId]);

  const readAuthToken = useCallback(() => {
    try {
      return String(sessionStorage.getItem('token') || localStorage.getItem('token') || '').trim();
    } catch {
      return '';
    }
  }, []);

  useEffect(() => {
    const newSocket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      rememberUpgrade: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 800,
      reconnectionDelayMax: 5000,
      timeout: 10000,
      autoConnect: true,
      withCredentials: true,
    });

    setSocket(newSocket);

    const registerIfPossible = () => {
      const currentUserId = resolveCurrentUserId();
      const token = readAuthToken();
      if (!currentUserId) return;
      if (!token) return;
      newSocket.emit('register', { userId: currentUserId, token });
      lastRegisteredUserIdRef.current = currentUserId;
      console.log('[Socket] register on connect:', currentUserId);
    };

    newSocket.on('connect', () => {
      console.log('[Socket] connected:', newSocket.id);
      setIsConnected(true);
      registerIfPossible();
      newSocket.emit('presence:sync');
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] disconnected');
      setIsConnected(false);
      setOnlineUserIds([]);
      lastRegisteredUserIdRef.current = '';
    });

    newSocket.on('reconnect', (attempt) => {
      console.log('[Socket] reconnected after', attempt, 'attempts');
      registerIfPossible();
    });

    newSocket.on('presence:update', (userIds: string[]) => {
      setOnlineUserIds(Array.isArray(userIds) ? userIds.map(String) : []);
    });

    newSocket.on('presence:user_joined', (uId: string) => {
      setOnlineUserIds(prev => {
        const strId = String(uId);
        if (!prev.includes(strId)) return [...prev, strId];
        return prev;
      });
    });

    newSocket.on('presence:user_left', (uId: string) => {
      setOnlineUserIds(prev => prev.filter(id => id !== String(uId)));
    });

    return () => {
      try {
        if (lastRegisteredUserIdRef.current) {
          newSocket.emit('unregister');
        }
      } catch {
        // no-op
      }
      newSocket.off('presence:update');
      newSocket.off('presence:user_joined');
      newSocket.off('presence:user_left');
      newSocket.disconnect();
    };
  }, [readAuthToken, resolveCurrentUserId]);

  // Handle account switch / logout while keeping same socket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const nextUserId = resolveCurrentUserId();
    const prevUserId = lastRegisteredUserIdRef.current;

    if (prevUserId && (!nextUserId || prevUserId !== nextUserId)) {
      socket.emit('unregister');
      lastRegisteredUserIdRef.current = '';
      console.log('[Socket] unregister previous user:', prevUserId);
    }

    if (nextUserId && prevUserId !== nextUserId) {
      const token = readAuthToken();
      if (!token) return;
      socket.emit('register', { userId: nextUserId, token });
      lastRegisteredUserIdRef.current = nextUserId;
      console.log('[Socket] register new user:', nextUserId);
    }
  }, [userId, socket, isConnected, readAuthToken, resolveCurrentUserId]);

  const registerUser = (id: string) => {
    if (socket && isConnected) {
      const normalized = String(id || '');
      const token = readAuthToken();
      if (!normalized) return;
      if (!token) return;
      socket.emit('register', { userId: normalized, token });
      lastRegisteredUserIdRef.current = normalized;
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUserIds, registerUser }}>
      {children}
    </SocketContext.Provider>
  );
};
