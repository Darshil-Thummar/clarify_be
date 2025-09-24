require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/db');
const appRouter = require('./routes/index');
const requestLogger = require('./middleware/requestLogger');
const cleanupService = require('./services/cleanupService');

const app = express();
const PORT = process.env.PORT || 8080;

connectDB(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => {
        console.error('❌ MongoDB connection failed:', err);
        process.exit(1);
    });

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

app.use(cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
}));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));
app.use(requestLogger);

app.get('/', (req, res) => res.send('✅ Server is running'));

// Health check endpoints
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        version: process.env.npm_package_version || '1.0.0'
    });
});

app.get('/health/detailed', async (req, res) => {
    try {
        const cleanupStats = await cleanupService.getCleanupStats();
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            version: process.env.npm_package_version || '1.0.0',
            database: 'connected',
            cleanupStats
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

app.use('/api', appRouter);

app.use((req, res) => res.status(404).json({
    status: 404,
    message: '❌ Route does not exist'
}));

app.use((err, req, res, next) => {
    console.error('❌ Global Error:', err.stack);
    res.status(err.status || 500).json({
        status: err.status || 500,
        message: err.message || 'Internal Server Error'
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    
    // Start cleanup service
    cleanupService.start();
    console.log('🧹 Cleanup service started');
});
