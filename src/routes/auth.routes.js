const express = require('express');
const { auth } = require('../middleware/auth.middleware');
const { register, login, getMe } = require('../controllers/auth.controller');

const router = express.Router();

// Маршруты аутентификации
router.post('/register', register);
router.post('/login', login);
router.get('/me', auth, getMe);

module.exports = router;
