const mongoose = require('mongoose');

async function connectDB(uri) {
    if (!uri) throw new Error('MONGODB_URI not provided');

    try {
        await mongoose.connect(uri);
        console.log('MongoDB connected');
    } catch (err) {
        console.error('MongoDB connection failed:', err.message);
        process.exit(1);
    }
}

module.exports = connectDB;
