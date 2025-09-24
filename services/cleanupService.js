const cron = require('node-cron');
const Session = require('../models/session');
const Analytics = require('../models/analytics');
const Feedback = require('../models/feedback');

class CleanupService {
  constructor() {
    this.isRunning = false;
  }

  /**
   * Start the cleanup service
   */
  start() {
    if (this.isRunning) {
      console.log('Cleanup service is already running');
      return;
    }

    // Run cleanup every day at 2 AM
    cron.schedule('0 2 * * *', async () => {
      console.log('Starting daily cleanup job...');
      await this.performCleanup();
    });

    this.isRunning = true;
    console.log('Cleanup service started - will run daily at 2 AM');
  }

  /**
   * Stop the cleanup service
   */
  stop() {
    if (!this.isRunning) {
      console.log('Cleanup service is not running');
      return;
    }

    cron.destroy();
    this.isRunning = false;
    console.log('Cleanup service stopped');
  }

  /**
   * Perform the actual cleanup
   */
  async performCleanup() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90); // 90 days ago

      console.log(`Cleaning up data older than ${cutoffDate.toISOString()}`);

      // Clean up deleted sessions older than 90 days
      const deletedSessions = await Session.find({
        status: 'deleted',
        deletedAt: { $lt: cutoffDate }
      });

      if (deletedSessions.length > 0) {
        await Session.deleteMany({
          status: 'deleted',
          deletedAt: { $lt: cutoffDate }
        });
        console.log(`Permanently deleted ${deletedSessions.length} old sessions`);
      }

      // Clean up analytics data older than 90 days
      const oldAnalytics = await Analytics.find({
        createdAt: { $lt: cutoffDate }
      });

      if (oldAnalytics.length > 0) {
        await Analytics.deleteMany({
          createdAt: { $lt: cutoffDate }
        });
        console.log(`Deleted ${oldAnalytics.length} old analytics records`);
      }

      // Clean up feedback data older than 90 days
      const oldFeedback = await Feedback.find({
        createdAt: { $lt: cutoffDate }
      });

      if (oldFeedback.length > 0) {
        await Feedback.deleteMany({
          createdAt: { $lt: cutoffDate }
        });
        console.log(`Deleted ${oldFeedback.length} old feedback records`);
      }

      // Clean up sessions that were never completed and are older than 7 days
      const incompleteSessions = await Session.find({
        status: 'active',
        createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      });

      if (incompleteSessions.length > 0) {
        await Session.updateMany(
          {
            status: 'active',
            createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
          },
          {
            $set: {
              status: 'deleted',
              deletedAt: new Date()
            }
          }
        );
        console.log(`Marked ${incompleteSessions.length} incomplete sessions as deleted`);
      }

      console.log('Daily cleanup job completed successfully');

    } catch (error) {
      console.error('Error during cleanup job:', error);
    }
  }

  /**
   * Manually trigger cleanup (for testing or immediate cleanup)
   */
  async manualCleanup() {
    console.log('Starting manual cleanup...');
    await this.performCleanup();
    console.log('Manual cleanup completed');
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats() {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - 90);

      const stats = {
        totalSessions: await Session.countDocuments(),
        deletedSessions: await Session.countDocuments({ status: 'deleted' }),
        oldDeletedSessions: await Session.countDocuments({
          status: 'deleted',
          deletedAt: { $lt: cutoffDate }
        }),
        totalAnalytics: await Analytics.countDocuments(),
        oldAnalytics: await Analytics.countDocuments({
          createdAt: { $lt: cutoffDate }
        }),
        totalFeedback: await Feedback.countDocuments(),
        oldFeedback: await Feedback.countDocuments({
          createdAt: { $lt: cutoffDate }
        }),
        incompleteSessions: await Session.countDocuments({
          status: 'active',
          createdAt: { $lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        })
      };

      return stats;
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      return null;
    }
  }
}

module.exports = new CleanupService();
