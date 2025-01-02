const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'Token is not valid' });
      }

      req.user = user;
      next();
    } catch (err) {
      console.error('Token verification error:', err);
      return res.status(401).json({ message: 'Token is not valid' });
    }
  } catch (err) {
    console.error('Auth middleware error:', err);
    return res.status(500).json({ message: 'Server error' });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      req.user = user || null;
    } catch (err) {
      req.user = null;
    }
    next();
  } catch (err) {
    req.user = null;
    next();
  }
};

module.exports = { auth, optionalAuth };
