let io;
const connectedUsers = new Map();

module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
      },
    });

    io.on('connection', (socket) => {
      console.log('[SOCKET] client connected:', socket.id);

      const emitPresence = () => {
        io.emit('presence:update', Array.from(connectedUsers.keys()));
      };

      const detachSocketFromUser = (socketInstance, userId) => {
        if (!userId) return;
        const uid = String(userId);
        const socketIds = connectedUsers.get(uid);
        if (!socketIds) return;

        socketIds.delete(socketInstance.id);
        socketInstance.leave(uid);

        if (socketIds.size === 0) connectedUsers.delete(uid);
        else connectedUsers.set(uid, socketIds);
      };

      socket.on('register', (userId) => {
        if (!userId) {
          console.warn('[SOCKET] register with null/undefined userId');
          return;
        }

        const nextUserId = String(userId);
        const prevUserId = socket.data?.userId ? String(socket.data.userId) : '';

        // Important: avoid one socket belonging to multiple account rooms
        if (prevUserId && prevUserId !== nextUserId) {
          detachSocketFromUser(socket, prevUserId);
        }

        socket.join(nextUserId);
        socket.data.userId = nextUserId;

        const socketIds = connectedUsers.get(nextUserId) || new Set();
        socketIds.add(socket.id);
        connectedUsers.set(nextUserId, socketIds);

        emitPresence();
        console.log(
          `[SOCKET] user ${nextUserId} joined room ${nextUserId} (socket: ${socket.id})`,
        );
      });

      socket.on('unregister', () => {
        const userId = socket.data?.userId;
        if (!userId) return;

        detachSocketFromUser(socket, userId);
        socket.data.userId = null;
        emitPresence();
        console.log(`[SOCKET] user ${String(userId)} unregistered from socket ${socket.id}`);
      });

      socket.on('typing_start', ({ recipientId, conversationId, senderId }) => {
        if (!recipientId || !conversationId || !senderId) return;
        io.to(String(recipientId)).emit('typing_start', {
          conversationId: String(conversationId),
          senderId: String(senderId),
        });
      });

      socket.on('typing_stop', ({ recipientId, conversationId, senderId }) => {
        if (!recipientId || !conversationId || !senderId) return;
        io.to(String(recipientId)).emit('typing_stop', {
          conversationId: String(conversationId),
          senderId: String(senderId),
        });
      });

      socket.on('disconnect', () => {
        const userId = socket.data?.userId;
        if (userId) {
          detachSocketFromUser(socket, userId);
          console.log(`[SOCKET] user ${String(userId)} disconnected`);
        }
        emitPresence();
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
