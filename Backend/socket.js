let io;
const connectedUsers = new Map();

module.exports = {
  init: (httpServer) => {
    io = require('socket.io')(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
      }
    });

    io.on('connection', (socket) => {
      console.log('🔗 Client kết nối Socket:', socket.id);

      socket.on('register', (userId) => {
        if (userId) {
          connectedUsers.set(userId, socket.id);
          console.log(`👤 User ${userId} đã đăng ký socket ${socket.id}`);
        }
      });

      socket.on('disconnect', () => {
        for (let [userId, socketId] of connectedUsers.entries()) {
          if (socketId === socket.id) {
            connectedUsers.delete(userId);
            console.log(`❌ User ${userId} ngắt kết nối.`);
            break;
          }
        }
      });
    });

    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error('Socket.io chưa được khởi tạo!');
    }
    return io;
  },
  getConnectedUsers: () => connectedUsers
};
