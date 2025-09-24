const mongoose = require("mongoose");

const feedbackSchema = new mongoose.Schema(
    {
        sessionId: {type: String, required: true},
        rating: {type: Number, required: true, min: 1, max: 5},
        helpful: {type: Boolean, required: true},
        comments: {type: String, maxlength: 1000},
        categories: [{type: String, enum: [
            'accuracy', 'clarity', 'usefulness', 'completeness', 'relevance'
        ]}],
        submittedAt: {type: Date, default: Date.now}
    },
    {timestamps: true}
);

// Index for performance
feedbackSchema.index({ sessionId: 1 });
feedbackSchema.index({ submittedAt: 1 });

module.exports = mongoose.model("Feedback", feedbackSchema);
