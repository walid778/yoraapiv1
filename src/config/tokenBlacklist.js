const jwt = require('jsonwebtoken');
const tokenBlacklist = new Set();

setInterval(() => {
  let removed = 0;

  for (const token of tokenBlacklist) {
    try {
      jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        tokenBlacklist.delete(token);
        removed++;
      }
    }
  }

  console.log(`🧼 Token blacklist cleaned, removed ${removed} expired tokens`);
  console.log(`📦 Current blacklist size: ${tokenBlacklist.size}`);
}, 24 * 60 * 60 * 1000); // كل 24 ساعة

module.exports = tokenBlacklist;
