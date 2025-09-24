const mongoose = require("mongoose");

const analyticsSchema = new mongoose.Schema(
    {
        sessionId: {type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true},
        userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: false},
        eventName: {type: String, required: true, enum: [
            'session_started',
            'input_received',
            'questions_asked',
            'loop_built',
            'spiess_built',
            'summary_built',
            'safe_exit',
            'user_deleted_data',
            'micro_test_completed',
            'day2_return'
        ]},
        eventData: {type: mongoose.Schema.Types.Mixed, default: {}},
        timestamp: {type: Date, default: Date.now},
        ipAddress: {type: String, required: false},
        userAgent: {type: String, required: false}
    },
    {timestamps: true}
);

// Index for performance
analyticsSchema.index({ sessionId: 1 });
analyticsSchema.index({ eventName: 1 });
analyticsSchema.index({ timestamp: 1 });
analyticsSchema.index({ userId: 1 });

module.exports = mongoose.model("Analytics", analyticsSchema);
