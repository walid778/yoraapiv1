const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'users', required: true },
    token: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RefreshToken', refreshTokenSchema);
