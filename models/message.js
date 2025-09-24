const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
    {
        sectionId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Section",
            required: true,
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

module.exports = mongoose.model("Message", messageSchema);
