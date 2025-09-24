const Message = require('../models/message');
const Session = require('../models/session');

/**
 * Create and store a message (human or openai) in a session
 * POST /api/v1/messages
 * Body: { sessionId: string, sender: 'human'|'openai', message: string }
 */
const createMessage = async (req, res) => {
    try {
        const { sessionId, sender, message } = req.body;

        if (!sessionId || !sender || !message) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'sessionId, sender, and message are required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        if (!['human', 'openai'].includes(sender)) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'sender must be either "human" or "openai"',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const session = await Session.findOne({ sessionId, status: { $ne: 'deleted' } });
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

        const created = await Message.create({ sessionId, sender, message });

        return res.status(201).json({
            success: true,
            message: 'Message stored',
            data: {
                _id: created._id,
                sessionId: created.sessionId,
                sender: created.sender,
                message: created.message,
                createdAt: created.createdAt
            }
        });
    } catch (error) {
        console.error('Create message error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to create message',
                timestamp: new Date().toISOString()
            }
        });
    }
};

/**
 * List messages by sessionId (ascending by createdAt so last is latest)
 * GET /api/v1/messages/:sessionId
 */
const listMessagesBySession = async (req, res) => {
    try {
        const { sessionId } = req.params;

        if (!sessionId) {
            return res.status(400).json({
                success: false,
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'sessionId is required',
                    timestamp: new Date().toISOString()
                }
            });
        }

        const session = await Session.findOne({ sessionId, status: { $ne: 'deleted' } });
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

        const messages = await Message.find({ sessionId }).sort({ createdAt: 1 }).lean();

        return res.json({
            success: true,
            count: messages.length,
            messages
        });
    } catch (error) {
        console.error('List messages error:', error);
        return res.status(500).json({
            success: false,
            error: {
                code: 'INTERNAL_SERVER_ERROR',
                message: 'Failed to fetch messages',
                timestamp: new Date().toISOString()
            }
        });
    }
};

module.exports = {
    createMessage,
    listMessagesBySession
};


