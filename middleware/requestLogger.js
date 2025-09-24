const RequestLog = require("../models/requestLog");

const requestLogger = async (req, res, next) => {
    const startTime = Date.now();

    res.on("finish", async () => {
        const duration = Date.now() - startTime;

        try {
            await RequestLog.create({
                method: req.method,
                url: req.originalUrl,
                statusCode: res.statusCode,
                ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
                userAgent: req.headers["user-agent"],
                headers: req.headers,
                params: req.params,
                query: req.query,
                payload: {
                    body: req.body,
                },
                responseTime: duration,
                timestamp: new Date(),
            });
        } catch (err) {
            console.error("❌ Failed to save request log:", err.message);
        }
    });

    next();
};

module.exports = requestLogger;
