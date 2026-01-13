const mongoose = require('mongoose');

const UserProfileSchema = new mongoose.Schema({
  authId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'auth',
    required: true
  },

  name: {
    type: String,
    trim: true,
  },

  username: {
    type: String,
    trim: true,
    unique: true,
    sparse: true // يسمح بقيم فارغة بدون مشاكل uniqueness
  },

  birth: {
    type: Date,
  },

  bio: {
    type: String,
    default: "",
  },

  avatar: {
    type: String,
    default: null,
  },

  cover: {
    type: String,
    default: null,
  },

  verification: {
  isVerified: {
    type: Boolean,
    default: false,
  },
  verifiedBy: {
    type: String, // admin | system | manual
    default: null,
  },
  verifiedAt: {
    type: Date,
    default: null,
  }
},

subscription: {
  plan: {
    type: String,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: false,
  }
},

  isAdmin: {
    type: Boolean,
    default: false,
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },

  updatedAt: {
    type: Date,
    default: Date.now,
  },

  fcmToken: {
    type: String,
    default: null,
  },

  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UsersProfile'
  }],

  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UsersProfile'
  }],

  // سجل المشتريات
  purchaseHistory: [{
    packageId: Number,
    productId: String,
    purchaseToken: String,
    purchaseDate: {
      type: Date,
      default: Date.now
    },
    amount: Number,
    platform: String,
    transactionId: String,
    status: {
      type: String,
      enum: ['pending', 'completed', 'cancelled', 'refunded'],
      default: 'completed'
    }
  }],


});

// قبل كل حفظ، حدّث الـ updatedAt
UserProfileSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const UserProfile = mongoose.model('UsersProfile', UserProfileSchema);
module.exports = UserProfile;
