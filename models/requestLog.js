const mongoose = require("mongoose");

const requestLogSchema = new mongoose.Schema({
    method: String,
    url: String,
    statusCode: Number,
    ip: String,
    userAgent: String,
    headers: mongoose.Schema.Types.Mixed,
    params: mongoose.Schema.Types.Mixed,
    query: mongoose.Schema.Types.Mixed,
    payload: {
        body: mongoose.Schema.Types.Mixed,
    },
    responseTime: Number,
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model("RequestLog", requestLogSchema);
