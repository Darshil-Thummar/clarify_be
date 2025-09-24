const express = require('express');
const router = express.Router();

const { createMessage, listMessagesBySession } = require('../../controllers/messageController');

// Create message
router.post('/messages', createMessage);

// Get messages by session
router.get('/messages/:sessionId', listMessagesBySession);

module.exports = router;


