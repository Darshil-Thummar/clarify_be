const express = require('express');
const { 
    analyze, 
    processAnswers, 
    getSession, 
    deleteSession, 
    submitFeedback 
} = require('../../controllers/chatController');
const authMiddleware = require('../../middleware/authMiddleware');

const router = express.Router();

// POST /v1/analyze - Analyze user input
router.post('/analyze', analyze);

// POST /v1/answers - Process answers to clarifying questions
router.post('/answers', processAnswers);

// GET /v1/session/:id - Get session by ID
router.get('/session/:id', getSession);

// DELETE /v1/session/:id - Delete session by ID
router.delete('/session/:id', deleteSession);

// POST /v1/feedback - Submit feedback for a session
router.post('/feedback', submitFeedback);

module.exports = router;
