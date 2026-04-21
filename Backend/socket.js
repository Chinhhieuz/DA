let io;
const connectedUsers = new Map();
const { isAllowedOrigin } = require('./utils/originAllowlist');
const jwt = require('jsonwebtoken');

const decodeSocketToken = (rawToken = '') => {
  const token = String(rawToken || '').trim();
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const accountId = String(decoded?.accountId || decoded?.id || '').trim();
    if (!accountId) return null;

    return {
      _id: accountId,
      role: String(decoded?.role || 'User')
    };
  } catch {
    return null;
  }
};

const getRegisterPayloadToken = (payload) => {
  if (!payload) return '';
  if (typeof payload === 'string') return '';
  return String(payload.token || '').trim();
};

const getRegisterPayloadUserId = (payload) => {
  if (!payload) return '';
  if (typeof payload === 'string') return String(payload).trim();
  return String(payload.userId || payload.accountId || '').trim();
};

module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer, {
      cors: {
        origin: (origin, callback) => {
          if (isAllowedOrigin(origin)) return callback(null, true);
          return callback(new Error('Not allowed by CORS'));
        },
        methods: ['GET', 'POST'],
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 20000,
    });

    io.on('connection', (socket) => {
      console.log('[SOCKET] client connected:', socket.id);

      socket.on('presence:sync', () => {
        socket.emit('presence:update', Array.from(connectedUsers.keys()));
      });

      const detachSocketFromUser = (socketInstance, userId) => {
        if (!userId) return;
        const uid = String(userId);
        const socketIds = connectedUsers.get(uid);
        if (!socketIds) return;

        socketIds.delete(socketInstance.id);
        socketInstance.leave(uid);

        if (socketIds.size === 0) {
          connectedUsers.delete(uid);
          io.emit('presence:user_left', uid);
        } else {
          connectedUsers.set(uid, socketIds);
        }
      };

      socket.on('register', (payload) => {
        const requestedUserId = getRegisterPayloadUserId(payload);
        const payloadToken = getRegisterPayloadToken(payload);
        const handshakeToken = String(socket.handshake?.auth?.token || '').trim();
        const claims = decodeSocketToken(payloadToken || handshakeToken);

        if (!claims?._id) {
          console.warn('[SOCKET] register rejected: invalid auth token');
          return;
        }

        if (requestedUserId && requestedUserId !== claims._id) {
          console.warn('[SOCKET] register rejected: userId does not match token subject');
          return;
        }

        const nextUserId = claims._id;
        if (!nextUserId) {
          console.warn('[SOCKET] register with null/undefined userId');
          return;
        }

        const prevUserId = socket.data?.userId ? String(socket.data.userId) : '';

        if (prevUserId && prevUserId !== nextUserId) {
          detachSocketFromUser(socket, prevUserId);
        }

        socket.join(nextUserId);
        socket.data.userId = nextUserId;
        socket.data.role = claims.role;

        const socketIds = connectedUsers.get(nextUserId) || new Set();
        const isFirstConnection = socketIds.size === 0;
        socketIds.add(socket.id);
        connectedUsers.set(nextUserId, socketIds);

        if (isFirstConnection) {
          io.emit('presence:user_joined', nextUserId);
        }
        console.log(
          `[SOCKET] user ${nextUserId} joined room ${nextUserId} (socket: ${socket.id})`,
        );
      });

      socket.on('unregister', () => {
        const userId = socket.data?.userId;
        if (!userId) return;

        detachSocketFromUser(socket, userId);
        socket.data.userId = null;
        console.log(`[SOCKET] user ${String(userId)} unregistered from socket ${socket.id}`);
      });

      socket.on('typing_start', ({ recipientId, conversationId }) => {
        const senderId = String(socket.data?.userId || '').trim();
        if (!recipientId || !conversationId || !senderId) return;
        io.to(String(recipientId)).emit('typing_start', {
          conversationId: String(conversationId),
          senderId,
        });
      });

      socket.on('typing_stop', ({ recipientId, conversationId }) => {
        const senderId = String(socket.data?.userId || '').trim();
        if (!recipientId || !conversationId || !senderId) return;
        io.to(String(recipientId)).emit('typing_stop', {
          conversationId: String(conversationId),
          senderId,
        });
      });

      socket.on('disconnect', () => {
        const userId = socket.data?.userId;
        if (userId) {
          detachSocketFromUser(socket, userId);
          console.log(`[SOCKET] user ${String(userId)} disconnected`);
        }
      });
    });

    return io;
  },

  getIO: () => {
    if (!io) {
      throw new Error('Socket.io is not initialized yet');
    }
    return io;
  },

  getConnectedUsers: () => connectedUsers,
};
