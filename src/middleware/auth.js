const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Simple in-memory token blacklist (for optional logout). In production, use Redis or DB.
const tokenBlacklist = new Set();

function blacklistToken(token) {
  tokenBlacklist.add(token);
}

async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) {
      return res.status(401).json({ success: false, message: 'Unauthorized', data: null });
    }

    if (tokenBlacklist.has(token)) {
      return res.status(401).json({ success: false, message: 'Token has been invalidated', data: null });
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized', data: null });
    }
    req.user = user;
    req.token = token;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token', data: null });
  }
}

module.exports = { authenticate, blacklistToken };


