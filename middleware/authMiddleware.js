const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ok: false, message: 'No token provided or invalid format'});
        }

        const token = authHeader.split(' ')[1].trim();

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ok: false, message: 'Invalid or expired token', error: err.message});
        }

        const user = await User.findOne({_id: decoded.id, deleted_at: null}).select('-passwordHash');
        if (!user) {
            return res.status(401).json({ok: false, message: 'User not found or deleted'});
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({ok: false, message: 'Server error', error: err.message});
    }
};

module.exports = authMiddleware;
