const express = require('express');
const router = express.Router();
const { createJiraTicket, getUserTickets } = require('../controllers/jiraController');
const { protect } = require('../middleware/authMiddleware');

router.post('/tickets', protect, createJiraTicket);
router.get('/tickets/:email', protect, getUserTickets);

module.exports = router;
