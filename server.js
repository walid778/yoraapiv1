const app = require('./src/app');
const https = require('https');
const http = require('http');
const fs = require('fs');
const socketio = require('socket.io');
const { initSocket } = require('./src/services/socket'); 

const PORT = process.env.PORT;
const HOST = process.env.SERVER_HOST;

if (process.env.NODE_ENV === 'production') {
  const options = {
    key: fs.readFileSync(process.env.SSL_KEY_PATH),
    cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    ca: fs.readFileSync(process.env.SSL_CA_PATH)
  };

  server = https.createServer(options, app);
  console.log('🚀 Running in PRODUCTION mode with HTTPS');
} else {
  server = http.createServer(app);
  console.log('🚀 Running in DEVELOPMENT mode with HTTP');
}


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
