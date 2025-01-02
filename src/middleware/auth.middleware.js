const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    // Получаем токен из заголовка
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      throw new Error();
    }

    // Проверяем токен
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Находим пользователя
    const user = await User.findOne({ _id: decoded.userId, isBlocked: false });
    
    if (!user) {
      throw new Error();
    }

    // Добавляем пользователя в объект запроса
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate.' });
  }
};

// Middleware для проверки прав администратора
const adminAuth = async (req, res, next) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin rights required.' });
    }
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate.' });
  }
};

module.exports = { auth, adminAuth };
