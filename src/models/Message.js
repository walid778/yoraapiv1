const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UsersProfile',
    required: true
  },
  emoji: {
    type: String,
    required: true
  }
}, { _id: false });

const attachmentSchema = new mongoose.Schema({
  url: { type: String, required: true },
  filename: String,
  size: Number,
  mimeType: String,
  duration: Number // voice duration
}, { _id: false });

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UsersProfile',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UsersProfile',
    required: true
  },

  text: { type: String, default: '' },

  type: {
    type: String,
    enum: [
      'text',
      'image',
      'video',
      'voice',
      'file',
      'gif',
      'sticker',
      'location'
    ],
    default: 'text'
  },

  attachment: attachmentSchema,

  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  },

  reactions: [reactionSchema],

  delivered: { type: Boolean, default: false },
  deliveredAt: Date,

  seen: { type: Boolean, default: false },
  seenAt: Date,

  deleted: { type: Boolean, default: false },
  deletedAt: Date,
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UsersProfile'
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, seen: 1 });
messageSchema.index({ deleted: 1 });

module.exports = mongoose.model('Message', messageSchema);
