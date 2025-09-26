const analysisService = require('../services/analysisService');
const Session = require('../models/session');
const Feedback = require('../models/feedback');
const AnalyticsService = require('../services/analyticsService');
const SchemaValidationMiddleware = require('../middleware/schemaValidation');
const mongoose = require('mongoose');
const Message = require('../models/message');

/**
 * Analyze user input and generate narrative loop, SPIESS map, and summary
 * POST /v1/analyze
 */
const analyze = async (req, res) => {
    try {
        const {input, storageOptIn = false, redactNames = true, user} = req.body;
        const userId = user ? user : null;

        if (!input || typeof input !== 'string') {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Input is required and must be a string',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const result = await analysisService.analyze(input, {
            userId,
            storageOptIn,
            redactNames
        }, req);

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Save session if storage is opted in
        if (storageOptIn) {
            try {
                const session = new Session({
                    sessionId: result.sessionId,
                    userId,
                    input: result.input || input,
                    clarifyingQuestions: result.questions || [],
                    narrativeLoop: result.narrativeLoop,
                    spiessMap: result.spiessMap,
                    summary: result.summary,
                    tags: result.tags || [],
                    storageOptIn,
                    redactNames
                });

                await session.save();
            } catch (error) {
                console.error('Error saving session:', error);
                // Continue without failing the request
            }
        }

        // Store messages: user's input and assistant's questions
        try {
            await Message.create({
                sessionId: result.sessionId,
                sender: 'human',
                message: input
            });

            const questions = Array.isArray(result.questions) ? result.questions : [];
            if (questions.length > 0) {
                const assistantContent = questions.map((q, i) => `Q${i + 1}: ${q}`).join('\n');
                await Message.create({
                    sessionId: result.sessionId,
                    sender: 'openai',
                    message: assistantContent
                });
            }
        } catch (error) {
            console.error('Error storing analyze messages:', error);
            // Continue without failing the request
        }

        return res.json(result);

    } catch (error) {
        console.error('Analyze error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Analysis failed due to server error',
                timestamp: new Date().toISOString()
            }
        });
    }
};

/**
 * Process answers to clarifying questions
 * POST /v1/answers
 */
const processAnswers = async (req, res) => {
    try {
        const { sessionId, answers } = req.body;
        const userId = req.user ? req.user._id : null;

        if (!sessionId || !Array.isArray(answers) || !mongoose.Types.ObjectId.isValid(sessionId)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Valid MongoDB Session ID and answers array are required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const result = await analysisService.processAnswers(sessionId, answers, {
            userId
        }, req);

        if (!result.success) {
            return res.status(400).json(result);
        }

        // Update session if it exists
        try {
            const session = await Session.findOne({ sessionId });
            if (session) {
                session.narrativeLoop = result.narrativeLoop;
                session.spiessMap = result.spiessMap;
                session.summary = result.summary;
                session.tags = result.tags || [];
                session.status = 'completed';
                await session.save();
            }
        } catch (error) {
            console.error('Error updating session:', error);
            // Continue without failing the request
        }

        // Store messages: user's answers and assistant's response
        try {
            await Message.create({
                sessionId,
                sender: 'human',
                message: Array.isArray(answers) ? answers.map((a, i) => `A${i + 1}: ${a}`).join('\n') : String(answers)
            });

            const assistantPayload = {
                narrativeLoop: result.narrativeLoop,
                spiessMap: result.spiessMap,
                summary: result.summary
            };
            await Message.create({
                sessionId,
                sender: 'openai',
                message: JSON.stringify(assistantPayload)
            });
        } catch (error) {
            console.error('Error storing answers messages:', error);
            // Continue without failing the request
        }

        return res.json(result);

    } catch (error) {
        console.error('Process answers error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Answer processing failed due to server error',
                timestamp: new Date().toISOString()
            }
        });
    }
};

/**
 * Get all sessions for the current user
 * GET /v1/sessions
 */
const getAllSession = async (req, res) => {
    try {
        const userId = req.user ? req.user._id : null;

        if (!userId) {
            return res.status(401).json({
                success: false,
                error: {
                    code: 'UNAUTHORIZED',
                    message: 'User not authenticated',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const sessions = await Session.find({
            userId: userId,
            status: {$ne: 'deleted'}
        }).sort({createdAt: -1});

        return res.json({
            success: true,
            count: sessions.length,
            sessions: sessions.map(session => ({
                sessionId: session.sessionId,
                status: session.status,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                input: session.storageOptIn ? session.input : null,
                clarifyingQuestions: session.clarifyingQuestions,
                narrativeLoop: session.narrativeLoop,
                spiessMap: session.spiessMap,
                summary: session.summary,
                tags: session.tags
            }))
        });

    } catch (error) {
        console.error('Get all sessions error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to retrieve sessions',
                timestamp: new Date().toISOString()
            }
        });
    }
};

/**
 * Get session by ID
 * GET /v1/session/{id}
 */
const getSession = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user._id : null;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Valid MongoDB Session ID is required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const session = await Session.findOne({ 
            sessionId: id,
            status: { $ne: 'deleted' }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'INVALID_SESSION',
                    message: 'Session not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const analytics = await AnalyticsService.getSessionSummary(id);

        return res.json({
            success: true,
            session: {
                sessionId: session.sessionId,
                status: session.status,
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
                input: session.storageOptIn ? session.input : null,
                clarifyingQuestions: session.clarifyingQuestions,
                narrativeLoop: session.narrativeLoop,
                spiessMap: session.spiessMap,
                summary: session.summary,
                tags: session.tags,
                analytics
            }
        });

    } catch (error) {
        console.error('Get session error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to retrieve session',
                timestamp: new Date().toISOString()
            }
        });
    }
};

/**
 * Delete session by ID
 * DELETE /v1/session/{id}
 */
const deleteSession = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user ? req.user._id : null;

        if (!id || !mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Valid MongoDB Session ID is required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const session = await Session.findOne({ 
            sessionId: id,
            status: { $ne: 'deleted' }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'INVALID_SESSION',
                    message: 'Session not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Check if user has access to this session
        if (session.userId && session.userId.toString() !== userId?.toString()) {
            return res.status(403).json({
                success: false,
                error: {
                    code: 'INVALID_SESSION',
                    message: 'Access denied to this session',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Soft delete the session
        session.status = 'deleted';
        session.deletedAt = new Date();
        await session.save();

        // Track deletion event
        await AnalyticsService.trackUserDeletedData(id, userId, req);

        return res.json({
            success: true,
            message: 'Session deleted successfully'
        });

    } catch (error) {
        console.error('Delete session error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to delete session',
                timestamp: new Date().toISOString()
            }
        });
    }
};

/**
 * Submit feedback for a session
 * POST /v1/feedback
 */
const submitFeedback = async (req, res) => {
    try {
        const { sessionId, rating, helpful, comments, categories } = req.body;
        const userId = req.user ? req.user._id : null;

        // Validate feedback data
        const validation = SchemaValidationMiddleware.validateFeedback({
            sessionId,
            rating,
            helpful,
            comments,
            categories,
            submittedAt: new Date().toISOString()
        });

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                error: SchemaValidationMiddleware.createErrorResponse(validation.error)
            });
        }

        // Check if session exists
        const session = await Session.findOne({ 
            sessionId,
            status: { $ne: 'deleted' }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                error: {
                    code: 'INVALID_SESSION',
                    message: 'Session not found',
                    timestamp: new Date().toISOString()
                }
            });
        }

        // Save feedback
        const feedback = new Feedback({
            sessionId,
            rating,
            helpful,
            comments,
            categories,
            submittedAt: new Date()
        });

        await feedback.save();

        return res.json({
            success: true,
            message: 'Feedback submitted successfully',
            feedbackId: feedback._id
        });

    } catch (error) {
        console.error('Submit feedback error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to submit feedback',
                timestamp: new Date().toISOString()
            }
        });
    }
};

module.exports = {
    analyze,
    processAnswers,
    getAllSession,
    getSession,
    deleteSession,
    submitFeedback
};