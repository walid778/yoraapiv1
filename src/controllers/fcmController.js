const admin = require('firebase-admin');
const Notification = require('../models/Notification');
const UserProfile = require('../models/User');

const sendSocketNotification = async (
  io,
  { userId, senderId, type, postId }
) => {
  try {
    console.log(`📨 Preparing notification: type=${type}, user=${userId}`);

    // 1️⃣ حفظ الإشعار في DB (حسب الاسكيما الجديدة)
    const notification = await Notification.create({
      user: userId,
      sender: senderId || null,
      type,
      post: postId || null,
    });

    // 2️⃣ Payload موحّد (Socket + FCM)
   const sender = senderId
  ? await UserProfile.findById(senderId).select('name avatar')
  : null;

const payload = {
  id: notification._id.toString(),
  type,
  postId: postId ? postId.toString() : null,
  senderId: senderId ? senderId.toString() : null,
  senderName: sender?.name ?? null, // 👈 مهم
  senderAvatar: sender?.avatar ?? null,
  createdAt: notification.createdAt.toISOString(),
};


    // 3️⃣ محاولة الإرسال عبر Socket.io
    console.log(`🔌 Attempting Socket.io delivery to user ${userId}`);

    if (io?.sendNotification) {
      const sentViaSocket = io.sendNotification(
        userId.toString(),
        payload
      );

      if (sentViaSocket) {
        console.log(`✅ Sent via Socket.io`);
        return true;
      }
    }

    // 4️⃣ Fallback إلى FCM
    console.log(`📲 Falling back to FCM`);

    const user = await UserProfile.findById(userId);

    if (user?.fcmToken) {
  const message = {
  token: user.fcmToken,
  notification: {
    title: _getTitle(type),
    body: sender?.name
      ? `${sender.name} ${_getBody(type)}`
      : _getBody(type),
  },
  data: {
    id: payload.id,
    type,
    postId: payload.postId ?? '',
    senderId: payload.senderId ?? '',
    senderName: sender?.name ?? '',
    senderAvatar: sender?.avatar ?? '',
  },
};


  await admin.messaging().send(message);
  console.log(`✅ Sent via FCM`);
  return true;
}

    console.log(`⚠️ No socket & no FCM token`);
    return false;

  } catch (err) {
    console.error('❌ Error sending notification:', err);
    return false;
  }
};

const _getTitle = (type) => {
  switch (type) {
    case 'like':
      return 'New Like';
    case 'comment':
      return 'New Comment';
    case 'friend_request':
      return 'Friend Request';
    default:
      return 'New Notification';
  }
};

const _getBody = (type) => {
  switch (type) {
    case 'like':
      return 'Liked your post';
    case 'comment':
      return 'Commented on your post';
    case 'friend_request':
      return 'Sent you a friend request';
    default:
      return 'You have a new notification';
  }
};

const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;

   const notifications = await Notification.find({ user: userId })
  .sort({ createdAt: -1 })
  .populate('sender', 'name avatar'); // هيسحب الاسم والصورة


    const formatted = notifications.map(n => ({
  id: n._id.toString(),
  type: n.type,
  postId: n.post ? n.post.toString() : null,
  senderId: n.sender?._id.toString() ?? null,
  senderName: n.sender?.name ?? 'Someone',
  senderAvatar: n.sender?.avatar ?? null,
  message: n.message ?? `${n.sender?.name ?? 'Someone'} ${_getBody(n.type)}`,
  read: n.read,
  createdAt: n.createdAt.toISOString(),
}));


    return res.status(200).json({ success: true, notifications: formatted });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// PATCH /api/notifications/:id/read
const markAsRead = async (req, res) => {
  try {
    const notificationId = req.params.id;
    await Notification.findByIdAndUpdate(notificationId, { read: true });
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error marking notification as read:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// DELETE /api/notifications/:id
const deleteNotification = async (req, res) => {
  try {
    const notificationId = req.params.id;
    await Notification.findByIdAndDelete(notificationId);
    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error deleting notification:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = 
{
    sendSocketNotification,
    
    getNotifications,
    markAsRead,
    deleteNotification,
};
