import express from 'express';
import { createJiraTicket, getUserTickets } from '../controllers/jiraController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/tickets', protect, createJiraTicket);
router.get('/tickets/:email', protect, getUserTickets);

export default router;
