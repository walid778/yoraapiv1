const jwt = require('jsonwebtoken');
const tokenBlacklist = require('../config/tokenBlacklist');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return res.status(401).json({ status: false, message: 'Invalid authorization header' });
}

  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ 
      status: false,
      message: 'Access denied - No token provided' 
    });
  }

   if (tokenBlacklist.has(token)) {
    return res.status(401).json({ 
      status: false,
      message: 'Token has been invalidated' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    //console.log('Decoded Token:', decoded);
    // تأكد من وجود البيانات الأساسية في التوكن
    if (!decoded.id || !decoded.email) {
      return res.status(403).json({ 
        status: false,
        message: 'Invalid token payload' 
      });
    }
    
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: false,
        message: 'Token expired',
        requiresRefresh: true 
      });
    } else if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        status: false,
        message: 'Invalid token' 
      });
    } else {
      return res.status(403).json({ 
        status: false,
        message: 'Token verification failed' 
      });
    }
  }
};

module.exports = verifyToken;