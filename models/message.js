const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        sessionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Session",
            required: true,
            index: true,
        },
        sender: {
            type: String,
            enum: ["human", "openai"],
            required: true,
        },
        message: {
            type: String,
            required: true,
        },
    },
    {timestamps: true}
);

// Index for query performance
messageSchema.index({ sessionId: 1, createdAt: 1 });

module.exports = mongoose.model("Message", messageSchema);
