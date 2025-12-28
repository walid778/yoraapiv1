const mongoose = require('mongoose');
const { Schema } = mongoose;

const reactionSchema = new Schema({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'UsersProfile', 
    required: true 
  },
  type: { 
    type: String, 
    enum: ['like', 'love', 'haha', 'wow', 'sad', 'angry'], 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

const commentSchema = new Schema({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'UsersProfile', 
    required: true 
  },
  content: { 
    type: String, 
    required: true,
    trim: true
  },
  parentCommentId: {
    type: Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  mentionedUserIds: [{
    type: Schema.Types.ObjectId,
    ref: 'UsersProfile'
  }],
  reactions: [reactionSchema],
  isDeleted: {
    type: Boolean,
    default: false
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});

const postSchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'UsersProfile',
    required: true,
  },
  content: {
    type: String,
    trim: true,
  },
  type: {
    type: String,
    enum: ['text', 'media'],
    default: 'text',
    required: true,
  },
  pinned: {
  type: Boolean,
  default: false,
},
  mediaUrl: {
    type: String,
    default: null,
  },
  mentionedUserIds: [{
    type: Schema.Types.ObjectId,
    ref: 'UsersProfile'
  }],
  reactions: [reactionSchema],
  comments: [commentSchema],
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Auto-update `updatedAt` before saving
postSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

commentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Post', postSchema);