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

      // --- CHỨC NĂNG NHẮN TIN TRỰC TUYẾN ---
      socket.on('send_message', (data) => {
        const { recipientId, message } = data;
        const recipientSocketId = connectedUsers.get(recipientId);
        
        if (recipientSocketId) {
          // Gửi trực tiếp tới recipient nếu họ đang online
          io.to(recipientSocketId).emit('receive_message', message);
          console.log(`✉️ Tin nhắn đã được chuyển tiếp tới User ${recipientId}`);
        }
      });

      socket.on('revoke_message', (data) => {
        const { recipientId, messageId, conversationId } = data;
        const recipientSocketId = connectedUsers.get(recipientId);
        
        if (recipientSocketId) {
          io.to(recipientSocketId).emit('message_revoked', { messageId, conversationId });
          console.log(`✉️ Thông báo thu hồi tin nhắn ${messageId} đã được gửi tới User ${recipientId}`);
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
