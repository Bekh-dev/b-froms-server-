const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { createJiraTicket, getUserTickets } = require('../controllers/jiraController');

const router = express.Router();

// Create a new Jira ticket
router.post('/tickets', protect, createJiraTicket);

// Get user's tickets
router.get('/tickets', protect, getUserTickets);

module.exports = router;
