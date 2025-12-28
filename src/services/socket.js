const jwt = require("jsonwebtoken");


let ioInstance = null;
let userSockets = new Map();
let typingUsers = new Map();

function initSocket(io) {
  if (ioInstance) {
    console.log("⚠️ Socket already initialized, skipping");
    return;
  }

  ioInstance = io;

  // Middleware للمصادقة
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (!token) {
        console.log("❌ No token provided");
        return next(new Error("Authentication error: No token provided"));
      }

      jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
          console.log("❌ Invalid token:", err.message);
          return next(new Error("Authentication error: Invalid token"));
        }
        
        socket.userId = decoded.id;
        socket.userName = decoded.name || "User";
        console.log(`✅ Authenticated user: ${socket.userId} (${socket.userName})`);
        next();
      });
    } catch (error) {
      console.error("❌ Auth middleware error:", error);
      next(new Error("Authentication error"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.userId;
    const userName = socket.userName;
    
    console.log(`🟢 New connection: ${socket.id}, User: ${userName} (${userId})`);

    
    // إغلاق الاتصال القديم لنفس المستخدم
    if (userSockets.has(userId)) {
      const oldSocket = userSockets.get(userId);
      console.log(`🔄 Closing old connection for user ${userId}`);
      oldSocket.disconnect(true);
    }

    // حفظ الاتصال الجديد
    userSockets.set(userId, socket);
    io.emit("user_online", { userId, userName, timestamp: new Date().toISOString() });
    console.log(`📊 Total connected users: ${userSockets.size}`);

    // إرسال حدث للمستخدم الجديد
    socket.emit('connected', {
      message: 'Connected to server',
      userId: userId,
      timestamp: new Date().toISOString()
    });

    // إرسال عدد المستخدمين المتصلين للجميع
    io.emit("connected_users_count", userSockets.size);


    // Typing indicator
    socket.on('typing', (data) => {
      try {
        const { receiverId, senderId } = data;
        
        console.log(`⌨️ ${userName} is typing to ${receiverId}`);
        
        const receiverSocket = userSockets.get(receiverId);
        if (receiverSocket && receiverSocket.connected) {
          receiverSocket.emit('typing', {
            senderId: senderId,
            receiverId: receiverId,
            timestamp: new Date().toISOString()
          });
        }
        
        // Store typing state
        typingUsers.set(senderId, {
          receiverId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('❌ Error handling typing event:', error);
      }
    });

    // Stop typing indicator
    socket.on('stop_typing', (data) => {
      try {
        const { receiverId, senderId } = data;
        
        console.log(`⏹️ ${userName} stopped typing to ${receiverId}`);
        
        const receiverSocket = userSockets.get(receiverId);
        if (receiverSocket && receiverSocket.connected) {
          receiverSocket.emit('stop_typing', {
            senderId: senderId,
            receiverId: receiverId,
            timestamp: new Date().toISOString()
          });
        }
        
        // Remove typing state
        typingUsers.delete(senderId);
      } catch (error) {
        console.error('❌ Error handling stop typing event:', error);
      }
    });

    // Send message
    socket.on('message', (data) => {
      try {
        const { receiverId, senderId, text, messageId } = data;
        
        console.log(`📨 Message from ${userName} to ${receiverId}: ${text.substring(0, 50)}...`);
        
        const receiverSocket = userSockets.get(receiverId);
        if (receiverSocket && receiverSocket.connected) {
          // User is online - send via socket
          receiverSocket.emit('message', {
            senderId: senderId,
            receiverId: receiverId,
            text: text,
            messageId: messageId,
            timestamp: new Date().toISOString(),
            showNotification: true
          });
          
          console.log(`✅ Message delivered via Socket.io`);
          
          // Send delivery confirmation
          socket.emit('message_delivered', {
            messageId: messageId,
            senderId: receiverId,
            timestamp: new Date().toISOString()
          });
        } else {
          // User is offline - send via FCM
          console.log(`⚠️ User ${receiverId} not connected. Attempting FCM delivery...`);
          sendMessageViaFCM(receiverId, senderId, text, messageId);
        }
        
        // Remove typing state
        typingUsers.delete(senderId);
      } catch (error) {
        console.error('❌ Error handling message event:', error);
      }
    });

    // Message seen
    socket.on('message_seen', (data) => {
      try {
        const { messageIds, senderId } = data;
        
        console.log(`👁️ Messages seen by ${userName} from ${senderId}`);
        
        const senderSocket = userSockets.get(senderId);
        if (senderSocket && senderSocket.connected) {
          senderSocket.emit('message_seen', {
            messageIds: messageIds,
            senderId: userId,
            timestamp: new Date().toISOString()
          });
        }
      } catch (error) {
        console.error('❌ Error handling message seen event:', error);
      }
    });

    // Request user statuses
    socket.on('request_user_statuses', (data) => {
      try {
        const { userIds } = data;
        if (!Array.isArray(userIds)) {
          console.warn('⚠️ Invalid userIds format');
          return;
        }

        console.log(`📋 User ${userId} requested statuses for ${userIds.length} users`);
        
        const statuses = userIds.map(uid => {
          const isOnline = userSockets.has(uid) && userSockets.get(uid).connected;
          return {
            userId: uid,
            isOnline: isOnline,
            lastSeen: isOnline ? null : new Date().toISOString()
          };
        });

        socket.emit('user_statuses', { statuses });
        console.log(`📤 Sent statuses for ${statuses.length} users to ${userId}`);
      } catch (error) {
        console.error('❌ Error handling request_user_statuses event:', error);
      }
    });

    // حدث اختبار
    socket.on('test_event', (data) => {
      console.log(`📨 Test event from ${userName}:`, data);
      socket.emit('test_response', {
        message: 'Test received',
        data: data,
        timestamp: new Date().toISOString()
      });
    });

    // حدث الإشعارات المخصص
    socket.on('send_notification', (data) => {
      console.log(`📨 Custom notification from ${userName}:`, data);
      
      if (data.targetUserId && data.message) {
        const targetSocket = userSockets.get(data.targetUserId);
        if (targetSocket && targetSocket.connected) {
          targetSocket.emit('notification', {
            type: data.type || 'custom',
            message: data.message,
            senderId: userId,
            senderName: userName,
            timestamp: new Date().toISOString()
          });
          console.log(`📤 Notification sent to user ${data.targetUserId}`);
        } else {
          console.log(`⚠️ Target user ${data.targetUserId} not connected`);
        }
      }
    });

    // إدارة الانقطاع
    socket.on("disconnect", (reason) => {
      console.log(`🔴 Disconnected: ${socket.id}, User: ${userName}, Reason: ${reason}`);
      
      const storedSocket = userSockets.get(userId);
      if (storedSocket && storedSocket.id === socket.id) {
        userSockets.delete(userId);
        console.log(`📊 User removed. Total connected: ${userSockets.size}`);
        
        // Emit user offline event
        io.emit("user_offline", { userId, userName, timestamp: new Date().toISOString() });
      }
      
      io.emit("connected_users_count", userSockets.size);
    });

    socket.on("error", (error) => {
      console.error(`❌ Socket error for ${userName}:`, error);
    });
  });

  console.log("🔥 Socket server initialized successfully");

   // Clean up typing users periodically
  setInterval(() => {
    const now = new Date();
    for (const [userId, typingData] of typingUsers.entries()) {
      if (now - typingData.timestamp > 10000) { // 10 seconds timeout
        typingUsers.delete(userId);
      }
    }
  }, 5000);

  // دالة لإرسال الإشعارات
  io.sendNotification = (userId, notificationData) => {
    try {
      const userSocket = userSockets.get(userId);
      if (userSocket && userSocket.connected) {
        userSocket.emit('notification', notificationData);
        console.log(`📤 Notification sent to user ${userId}:`, notificationData);
        return true;
      } else {
        console.log(`⚠️ User ${userId} is not connected. Notification saved in DB only.`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Error sending notification to user ${userId}:`, error);
      return false;
    }
  };

  // دالة للبث العام
  io.broadcastNotification = (notificationData, excludeUserId = null) => {
    try {
      if (excludeUserId) {
        const excludedSocket = userSockets.get(excludeUserId);
        if (excludedSocket) {
          excludedSocket.broadcast.emit('notification', notificationData);
        } else {
          io.emit('notification', notificationData);
        }
      } else {
        io.emit('notification', notificationData);
      }
      console.log(`📢 Broadcast notification:`, notificationData);
      return true;
    } catch (error) {
      console.error('❌ Error broadcasting notification:', error);
      return false;
    }
  };

  io.getConnectedUsers = () => {
    return Array.from(userSockets.keys());
  };

  io.getConnectedUsersCount = () => {
    return userSockets.size;
  };
}

function getIO() {
  if (!ioInstance) {
    throw new Error("Socket.io not initialized yet!");
  }
  return ioInstance;
}

/**
 * Send message via FCM when user is offline
 * Uses the same FCM infrastructure as notifications
 */
async function sendMessageViaFCM(receiverId, senderId, messageText, messageId) {
  try {
    const admin = require('firebase-admin');
    const UserProfile = require('../models/User');
    
    // Fetch receiver and sender info
    const [receiver, sender] = await Promise.all([
      UserProfile.findById(receiverId).select('fcmToken name'),
      UserProfile.findById(senderId).select('name avatar')
    ]);

    if (!receiver) {
      console.log(`❌ Receiver ${receiverId} not found`);
      return false;
    }

    if (!receiver.fcmToken) {
      console.log(`⚠️ No FCM token for user ${receiverId}`);
      return false;
    }

    const senderName = sender?.name ?? 'User';
    const senderAvatar = sender?.avatar ?? null;

    // Prepare FCM message
    const fcmMessage = {
      token: receiver.fcmToken,
      notification: {
        title: 'New Message',
        body: `${senderName}: ${messageText.substring(0, 100)}`,
      },
      data: {
        type: 'message',
        senderId: senderId,
        receiverId: receiverId,
        messageId: messageId,
        text: messageText,
        senderName: senderName,
        senderAvatar: senderAvatar || '',
        timestamp: new Date().toISOString(),
        showNotification: 'true',
      },
    };

    // Send via FCM
    await admin.messaging().send(fcmMessage);
    console.log(`✅ Message delivered via FCM to ${receiverId}`);
    return true;

  } catch (error) {
    console.error(`❌ FCM message delivery error for user ${receiverId}:`, error.message);
    return false;
  }
}

module.exports = { initSocket, getIO, sendMessageViaFCM };
