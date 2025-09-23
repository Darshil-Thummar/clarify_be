const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { success, error } = require('../utils/response');
const { blacklistToken } = require('../middleware/auth');

function generateToken(userId) {
  const payload = { sub: userId };
  const options = { expiresIn: process.env.JWT_EXPIRES_IN || '7d' };
  return jwt.sign(payload, process.env.JWT_SECRET, options);
}

async function register(req, res) {
  try {
    const { username, email, password, firstName, lastName } = req.body || {};
    if (!username || !email || !password || !firstName || !lastName) {
      return error(res, 'Missing required fields', 400);
    }

    const existing = await User.findOne({ $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }] });
    if (existing) {
      return error(res, 'Email or username already in use', 409);
    }

    const saltRounds = parseInt(process.env.SALT_ROUNDS || '10', 10);
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
    });

    const token = generateToken(user._id.toString());
    return success(res, 'Registered successfully', { user: user.toPublicJSON(), token }, 201);
  } catch (e) {
    return error(res, 'Registration failed', 500);
  }
}

async function login(req, res) {
  try {
    const { username, email, password } = req.body || {};
    if ((!username && !email) || !password) {
      return error(res, 'Missing credentials', 400);
    }

    const query = username ? { username: username.toLowerCase() } : { email: email.toLowerCase() };
    const user = await User.findOne(query);
    if (!user) {
      return error(res, 'Invalid credentials', 401);
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return error(res, 'Invalid credentials', 401);
    }

    const token = generateToken(user._id.toString());
    return success(res, 'Logged in successfully', { user: user.toPublicJSON(), token });
  } catch (e) {
    return error(res, 'Login failed', 500);
  }
}

async function me(req, res) {
  return success(res, 'Fetched user', { user: req.user.toPublicJSON() });
}

async function logout(req, res) {
  if (req.token) {
    blacklistToken(req.token);
  }
  return success(res, 'Logged out successfully', null);
}

module.exports = { register, login, me, logout };


