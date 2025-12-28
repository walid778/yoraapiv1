const mongoose = require('mongoose');
const { Schema } = mongoose;

const storySchema = new Schema({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'UsersProfile',
    required: true,
  },
  mediaUrl: {
    type: String,
    
  },
  type: {
    type: String,
    enum: ['image', 'video', 'text'],
    default: 'image',
    required: true,
  },
  caption: {
    type: String,
    trim: true,
    default: '',
  },
  duration: {
    type: Number, // in seconds
    default: 5,
  },
  backgroundColor: {
    type: String,
    default: null,
  },
  viewedBy: [
    {
      user: {
        type: Schema.Types.ObjectId,
        ref: 'UsersProfile',
      },
      viewedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  isDeleted: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    index: { expireAfterSeconds: 0 }, // TTL index - auto delete after expiration
  },
});

// Ensure users with expired stories don't get returned
storySchema.query.notDeleted = function () {
  return this.where({ isDeleted: false });
};

module.exports = mongoose.model('Story', storySchema);
