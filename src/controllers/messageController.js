const mongoose = require('mongoose');
const Message = require('../models/Message');
const UserProfile = require('../models/User');

// ------------------------------------------------------------
// جلب كل المحادثات للمستخدم الحالي (آخر رسالة لكل محادثة)
// ------------------------------------------------------------
const getChatsX = async (req, res) => {
  try {
    const userId = new mongoose.Types.ObjectId(req.user.id);

    const chats = await Message.aggregate([
      {
        $match: {
          deleted: false,
          $or: [{ sender: userId }, { receiver: userId }]
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [
              { $eq: ['$sender', userId] },
              '$receiver',
              '$sender'
            ]
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiver', userId] },
                    { $eq: ['$seen', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'userprofiles',
          localField: '_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      { $unwind: '$user' },
      {
        $project: {
          user: {
            _id: '$user._id',
            name: '$user.name',
            username: '$user.username',
            avatar: '$user.avatar',
            isOnline: '$user.isOnline'
          },
          lastMessage: 1,
          unreadCount: 1
        }
      },
      { $sort: { 'lastMessage.createdAt': -1 } }
    ]);

    res.status(200).json({
      success: true,
      chats
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};

const getChats = async (req, res) => {
  try {
    const userId = req.user.id;

    // البحث عن جميع الرسائل التي للمستخدم الحالي كمرسل أو مستقبل
    const messages = await Message.find({
      deleted: false,
      $or: [{ sender: userId }, { receiver: userId }]
    })
    .sort({ createdAt: -1 })
    .lean();

    // تجميع المحادثات حسب المستخدم الآخر
    const conversationsMap = new Map();
    const userCache = new Map();

    for (const msg of messages) {
      const otherUserId = msg.sender.toString() === userId 
        ? msg.receiver.toString() 
        : msg.sender.toString();

      // إذا كانت المحادثة موجودة بالفعل، تخطى (نريد آخر رسالة فقط)
      if (conversationsMap.has(otherUserId)) {
        // زيادة العداد إذا كانت الرسالة غير مقروءة
        if (msg.receiver.toString() === userId && !msg.seen) {
          const conv = conversationsMap.get(otherUserId);
          conv.unreadCount += 1;
        }
        continue;
      }

      // جلب بيانات المستخدم الآخر من الكاش أولاً
      let otherUser;
      if (userCache.has(otherUserId)) {
        otherUser = userCache.get(otherUserId);
      } else {
        otherUser = await UserProfile.findById(otherUserId)
          .select('_id name username avatar isOnline')
          .lean();
        userCache.set(otherUserId, otherUser);
      }

      // إذا لم نجد المستخدم، تخطى هذه المحادثة
      if (!otherUser) {
        continue;
      }

      // حساب عدد الرسائل غير المقروءة
      const unreadCount = await Message.countDocuments({
        sender: otherUserId,
        receiver: userId,
        seen: false,
        deleted: false
      });

      // إضافة المحادثة
      conversationsMap.set(otherUserId, {
        user: {
          _id: otherUser._id,
          name: otherUser.name,
          username: otherUser.username,
          avatar: otherUser.avatar || '',
          isOnline: otherUser.isOnline || false
        },
        lastMessage: {
          _id: msg._id,
          sender: msg.sender,
          receiver: msg.receiver,
          text: msg.text || '',
          type: msg.type || 'text',
          createdAt: msg.createdAt,
          delivered: msg.delivered || false,
          seen: msg.seen || false
        },
        unreadCount
      });
    }

    // تحويل الـ Map إلى مصفوفة وترتيبها حسب وقت آخر رسالة
    const chats = Array.from(conversationsMap.values())
      .sort((a, b) => new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt));

    console.log(`Found ${chats.length} chats for user ${userId}`);

    res.status(200).json({
      success: true,
      chats
    });

  } catch (err) {
    console.error('Error in getChats:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

const getChatsD = async (req, res) => {
  try {
    const userId = req.user.id;

    // البحث عن جميع الرسائل الفريدة (آخر رسالة لكل محادثة)
    const uniqueMessages = await Message.aggregate([
      {
        $match: {
          deleted: false,
          $or: [{ sender: userId }, { receiver: userId }]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: {
            $cond: {
              if: { $eq: ['$sender', userId] },
              then: '$receiver',
              else: '$sender'
            }
          },
          lastMessage: { $first: '$$ROOT' }
        }
      }
    ]);

    // تحضير النتيجة
    const chats = [];
    
    for (const item of uniqueMessages) {
      const otherUserId = item._id;
      const lastMessage = item.lastMessage;

      // جلب بيانات المستخدم الآخر
      const otherUser = await UserProfile.findById(otherUserId)
        .select('_id name username avatar isOnline')
        .lean();

      if (!otherUser) continue;

      // حساب الرسائل غير المقروءة
      const unreadCount = await Message.countDocuments({
        sender: otherUserId,
        receiver: userId,
        seen: false,
        deleted: false
      });

      chats.push({
        user: {
          _id: otherUser._id,
          name: otherUser.name,
          username: otherUser.username,
          avatar: otherUser.avatar || '',
          isOnline: otherUser.isOnline || false
        },
        lastMessage: {
          _id: lastMessage._id,
          sender: lastMessage.sender,
          receiver: lastMessage.receiver,
          text: lastMessage.text || '',
          type: lastMessage.type || 'text',
          createdAt: lastMessage.createdAt,
          delivered: lastMessage.delivered || false,
          seen: lastMessage.seen || false
        },
        unreadCount
      });
    }

    // ترتيب حسب آخر رسالة
    chats.sort((a, b) => 
      new Date(b.lastMessage.createdAt) - new Date(a.lastMessage.createdAt)
    );

    console.log(`Found ${chats.length} chats for user ${userId}`);

    res.status(200).json({
      success: true,
      chats
    });

  } catch (err) {
    console.error('Error in getChats:', err);
    res.status(500).json({ 
      success: false,
      message: err.message 
    });
  }
};

// -------------------------------
// إرسال رسالة جديدة
// -------------------------------
const sendMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const {
      receiverId,
      text = '',
      type = 'text',
      attachment,
      replyTo
    } = req.body;

    if (!receiverId || (!text && !attachment)) {
      return res.status(400).json({ success: false });
    }

    const message = await Message.create({
      sender: senderId,
      receiver: receiverId,
      text,
      type,
      attachment,
      replyTo,
      delivered: false,
      seen: false
    });

    const populated = await message.populate([
      { path: 'sender', select: '_id name avatar' },
      { path: 'receiver', select: '_id name avatar' },
      { path: 'replyTo' }
    ]);

    // ✅ IMPROVED: Emit socket event to receiver with complete message data
    // This enables real-time message delivery
    try {
      const { io: socketIO } = require('../../server');
      if (socketIO) {
        // Emit to receiver with complete message info
        socketIO.to(receiverId).emit('message', {
          _id: populated._id,
          senderId: senderId,
          sender: senderId,
          senderName: populated.sender.name,
          senderAvatar: populated.sender.avatar || '',
          receiverId: receiverId,
          text: text,
          type: type,
          messageId: populated._id,
          createdAt: populated.createdAt,
          timestamp: new Date().toISOString(),
          delivered: true,
          seen: false,
          showNotification: true
        });
        
        console.log(`✅ Message emitted via Socket.io to ${receiverId}`);
      }
    } catch (socketError) {
      console.warn('⚠️ Socket emission failed, message still saved:', socketError.message);
    }

    res.status(201).json({
      success: true,
      message: populated
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};


// -------------------------------
// تعليم رسالة كمقروءة
// -------------------------------
const markAsSeen = async (req, res) => {
  const { messageId } = req.params;

  const message = await Message.findByIdAndUpdate(
    messageId,
    { seen: true, seenAt: new Date() },
    { new: true }
  );

  if (!message) {
    return res.status(404).json({ success: false });
  }

  res.json({ success: true, message });
};


const markConversationAsSeen = async (req, res) => {
  try {
    const userId = req.user.id;
    const { chatUserId } = req.params;

    if (!userId || !chatUserId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing userId or chatUserId' 
      });
    }

    const result = await Message.updateMany(
      {
        sender: chatUserId,
        receiver: userId,
        seen: false
      },
      {
        $set: { seen: true, seenAt: new Date() }
      }
    );

    console.log(`✅ Marked ${result.modifiedCount} messages as seen for user ${userId} from ${chatUserId}`);

    // FIX: Emit socket event to sender so they see the checkmarks update in real-time
    try {
      const { io: socketIO } = require('../../server');
      if (socketIO) {
        socketIO.to(chatUserId).emit('message:seen', {
          senderId: chatUserId,
          receiverId: userId,
          messageIds: [], // Mark all messages as seen
          count: result.modifiedCount
        });
        console.log(`✅ Socket event sent to ${chatUserId} about seen messages`);
      }
    } catch (socketError) {
      console.warn('⚠️ Socket emission failed for seen event:', socketError.message);
    }

    res.json({ 
      success: true, 
      modifiedCount: result.modifiedCount,
      message: 'Conversation marked as seen'
    });
  } catch (error) {
    console.error('❌ Error marking conversation as seen:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to mark conversation as seen',
      error: error.message 
    });
  }
};

// -------------------------------
// جلب كل الرسائل لمحادثة معينة
// -------------------------------
const getChatMessages = async (req, res) => {
  try {
    const userId = req.user.id;
    const chatUserId = req.params.chatId;

    const messages = await Message.find({
      deleted: false,
      $or: [
        { sender: userId, receiver: chatUserId },
        { sender: chatUserId, receiver: userId }
      ]
    })
      .sort({ createdAt: 1 })
      .populate('replyTo');

    res.status(200).json({
      success: true,
      messages
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};


const deleteMessage = async (req, res) => {
  try {
    const userId = req.user.id;
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }

    // فقط المرسل يمكنه حذف الرسالة (أو يمكن إضافة خاصية حذف للطرفين)
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'ليس لديك صلاحية لحذف هذه الرسالة' 
      });
    }

    // حذف منطقي (soft delete)
    message.deleted = true;
    message.deletedAt = new Date();
    await message.save();

    return res.status(200).json({ success: true });

  } catch (err) {
    console.error('Error deleting message:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getChats,
  sendMessage,
  markAsSeen,
  getChatMessages,
  markConversationAsSeen,
  deleteMessage
};
