import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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

  const resolveCurrentUserId = () => {
    const propUserId = userId ? String(userId) : '';
    if (propUserId) return propUserId;

    try {
      const savedUserStr = localStorage.getItem('currentUser');
      if (!savedUserStr) return '';
      const savedUser = JSON.parse(savedUserStr);
      return String(savedUser?._id || savedUser?.id || '');
    } catch {
      return '';
    }
  };

  useEffect(() => {
    const newSocket = io(API_BASE_URL, {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      autoConnect: true,
    });

    setSocket(newSocket);

    const registerIfPossible = () => {
      const currentUserId = resolveCurrentUserId();
      if (!currentUserId) return;
      newSocket.emit('register', currentUserId);
      lastRegisteredUserIdRef.current = currentUserId;
      console.log('[Socket] register on connect:', currentUserId);
    };

    newSocket.on('connect', () => {
      console.log('[Socket] connected:', newSocket.id);
      setIsConnected(true);
      registerIfPossible();
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

    return () => {
      try {
        if (lastRegisteredUserIdRef.current) {
          newSocket.emit('unregister');
        }
      } catch {
        // no-op
      }
      newSocket.off('presence:update');
      newSocket.disconnect();
    };
  }, []);

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
      socket.emit('register', nextUserId);
      lastRegisteredUserIdRef.current = nextUserId;
      console.log('[Socket] register new user:', nextUserId);
    }
  }, [userId, socket, isConnected]);

  const registerUser = (id: string) => {
    if (socket && isConnected) {
      const normalized = String(id || '');
      if (!normalized) return;
      socket.emit('register', normalized);
      lastRegisteredUserIdRef.current = normalized;
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, onlineUserIds, registerUser }}>
      {children}
    </SocketContext.Provider>
  );
};
