const express = require('express');
const router = express.Router();
const { createJiraTicket, getUserTickets } = require('../controllers/jiraController');
const authMiddleware = require('../middleware/auth');

router.post('/tickets', authMiddleware, createJiraTicket);
router.get('/tickets/:email', authMiddleware, getUserTickets);

module.exports = router;
