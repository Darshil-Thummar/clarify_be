const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/user");

const createToken = (user) => {
    return jwt.sign({id: user._id}, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });
};

const register = async (req, res) => {
    try {
        const {email, password, firstName, lastName, contact} = req.body;

        const exist = await User.findOne({email: email.toLowerCase()});
        if (exist) return res.status(400).json({ok: false, message: "Email already in use"});

        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const user = new User({
            email: email.toLowerCase(),
            passwordHash,
            firstName: firstName || null,
            lastName: lastName || null,
            contact: contact || null,
        });

        await user.save();

        const token = createToken(user);

        const userObj = user.toObject();
        delete userObj.passwordHash;

        return res.status(201).json({ok: true, user: userObj, token});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ok: false, message: "Server error", error: err.message});
    }
};

const login = async (req, res) => {
    try {
        const {email, password} = req.body;

        if (!email || !password)
            return res.status(400).json({ok: false, message: "Email and password required"});

        const user = await User.findOne({email: email.toLowerCase(), deleted_at: null});
        if (!user) return res.status(400).json({ok: false, message: "Invalid credentials"});

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) return res.status(400).json({ok: false, message: "Invalid credentials"});

        const token = createToken(user);
        const userObj = user.toObject();
        delete userObj.passwordHash;

        return res.json({ok: true, user: userObj, token});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ok: false, message: "Server error", error: err.message});
    }
};

const me = async (req, res) => {
    try {
        return res.json({ok: true, user: req.user});
    } catch (err) {
        console.error(err);
        return res.status(500).json({ok: false, message: "Server error", error: err.message});
    }
};

module.exports = {register, login, me};
