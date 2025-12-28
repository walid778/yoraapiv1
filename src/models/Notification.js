const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UsersProfile',
    required: true, // صاحب الإشعار
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UsersProfile', // اللي عمل اللايك أو الكومنت
  },

  type: {
    type: String,
    enum: ['like', 'comment', 'friend_request', 'system'],
    required: true,
  },

  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Posts',
  },

  message: {
    type: String, // optional (fallback)
  },

  read: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Notification', notificationSchema);
