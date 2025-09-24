const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        email: {type: String, required: true, unique: true, trim: true, lowercase: true},
        passwordHash: {type: String, required: true},
        firstName: {type: String, default: null, trim: true},
        lastName: {type: String, default: null, trim: true},
        contact: {type: String, default: null},
        deleted_at: {type: Date, default: null},
    },
    {timestamps: true}
);

module.exports = mongoose.model("User", userSchema);
