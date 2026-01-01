const app = require('./src/app');
const http = require('http');
const socketio = require('socket.io');
const { initSocket } = require('./src/services/socket'); 

const PORT = process.env.PORT;
const HOST = process.env.SERVER_HOST;

const server = http.createServer(app);
console.log('🚀 Running in PRODUCTION mode with HTTP');

// إنشاء مثيل Socket.io
const io = socketio(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.FRONTEND_URL 
      : "*",
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket']   // 👈 أهم خطوة
});

initSocket(io);

// ✅ Export socketIO instance for use in controllers
module.exports = { server, io: io };

server.listen(PORT, () => {
  console.log(`🚀 Server running on ${HOST}:${PORT}`);
});


