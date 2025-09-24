const Analytics = require('../models/analytics');

class AnalyticsService {
  /**
   * Track an analytics event
   * @param {string} sessionId - Session ID
   * @param {string} eventName - Event name
   * @param {Object} eventData - Additional event data
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackEvent(sessionId, eventName, eventData = {}, userId = null, req = null) {
    try {
      const analytics = new Analytics({
        sessionId,
        userId,
        eventName,
        eventData,
        ipAddress: req ? req.ip : null,
        userAgent: req ? req.get('User-Agent') : null
      });

      await analytics.save();
      console.log(`Analytics event tracked: ${eventName} for session ${sessionId}`);
    } catch (error) {
      console.error('Error tracking analytics event:', error);
      // Don't throw error to avoid breaking main flow
    }
  }

  /**
   * Track session started event
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackSessionStarted(sessionId, userId = null, req = null) {
    await this.trackEvent(sessionId, 'session_started', {}, userId, req);
  }

  /**
   * Track input received event
   * @param {string} sessionId - Session ID
   * @param {number} inputLength - Length of input
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackInputReceived(sessionId, inputLength, userId = null, req = null) {
    await this.trackEvent(sessionId, 'input_received', { inputLength }, userId, req);
  }

  /**
   * Track questions asked event
   * @param {string} sessionId - Session ID
   * @param {Array} questions - Array of questions asked
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackQuestionsAsked(sessionId, questions, userId = null, req = null) {
    await this.trackEvent(sessionId, 'questions_asked', { 
      questionCount: questions.length,
      questions: questions.map(q => q.substring(0, 100)) // Truncate for privacy
    }, userId, req);
  }

  /**
   * Track narrative loop built event
   * @param {string} sessionId - Session ID
   * @param {Object} narrativeLoop - Narrative loop data
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackLoopBuilt(sessionId, narrativeLoop, userId = null, req = null) {
    await this.trackEvent(sessionId, 'loop_built', {
      hasTrigger: !!narrativeLoop.trigger,
      hasFear: !!narrativeLoop.fear,
      hasEmotion: !!narrativeLoop.emotion,
      hasOutcome: !!narrativeLoop.outcome,
      mechanismCount: narrativeLoop.mechanisms ? narrativeLoop.mechanisms.length : 0
    }, userId, req);
  }

  /**
   * Track SPIESS map built event
   * @param {string} sessionId - Session ID
   * @param {Object} spiessMap - SPIESS map data
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackSpiessBuilt(sessionId, spiessMap, userId = null, req = null) {
    await this.trackEvent(sessionId, 'spiess_built', {
      needsCount: spiessMap.needs ? spiessMap.needs.length : 0,
      hasMicroTest: !!spiessMap.microTest,
      hasToolAction: !!spiessMap.toolAction,
      protocol: spiessMap.toolAction ? spiessMap.toolAction.protocol : null
    }, userId, req);
  }

  /**
   * Track summary built event
   * @param {string} sessionId - Session ID
   * @param {Object} summary - Summary data
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackSummaryBuilt(sessionId, summary, userId = null, req = null) {
    await this.trackEvent(sessionId, 'summary_built', {
      contentLength: summary.content ? summary.content.length : 0,
      mechanismCount: summary.mechanisms ? summary.mechanisms.length : 0,
      hasNextStep: !!summary.nextStep
    }, userId, req);
  }

  /**
   * Track safe exit event
   * @param {string} sessionId - Session ID
   * @param {string} reason - Reason for safe exit
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackSafeExit(sessionId, reason, userId = null, req = null) {
    await this.trackEvent(sessionId, 'safe_exit', { reason }, userId, req);
  }

  /**
   * Track user deleted data event
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackUserDeletedData(sessionId, userId = null, req = null) {
    await this.trackEvent(sessionId, 'user_deleted_data', {}, userId, req);
  }

  /**
   * Track micro test completed event
   * @param {string} sessionId - Session ID
   * @param {Object} testResult - Test result data
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackMicroTestCompleted(sessionId, testResult, userId = null, req = null) {
    await this.trackEvent(sessionId, 'micro_test_completed', testResult, userId, req);
  }

  /**
   * Track day 2 return event
   * @param {string} sessionId - Session ID
   * @param {string} userId - User ID (optional)
   * @param {Object} req - Express request object (optional)
   */
  static async trackDay2Return(sessionId, userId = null, req = null) {
    await this.trackEvent(sessionId, 'day2_return', {}, userId, req);
  }

  /**
   * Get analytics for a session
   * @param {string} sessionId - Session ID
   * @returns {Array} - Array of analytics events
   */
  static async getSessionAnalytics(sessionId) {
    try {
      return await Analytics.find({ sessionId }).sort({ timestamp: 1 });
    } catch (error) {
      console.error('Error getting session analytics:', error);
      return [];
    }
  }

  /**
   * Get analytics summary for a session
   * @param {string} sessionId - Session ID
   * @returns {Object} - Analytics summary
   */
  static async getSessionSummary(sessionId) {
    try {
      const events = await this.getSessionAnalytics(sessionId);
      
      const summary = {
        totalEvents: events.length,
        events: events.map(event => ({
          eventName: event.eventName,
          timestamp: event.timestamp,
          eventData: event.eventData
        })),
        hasSessionStarted: events.some(e => e.eventName === 'session_started'),
        hasInputReceived: events.some(e => e.eventName === 'input_received'),
        hasQuestionsAsked: events.some(e => e.eventName === 'questions_asked'),
        hasLoopBuilt: events.some(e => e.eventName === 'loop_built'),
        hasSpiessBuilt: events.some(e => e.eventName === 'spiess_built'),
        hasSummaryBuilt: events.some(e => e.eventName === 'summary_built'),
        hasSafeExit: events.some(e => e.eventName === 'safe_exit')
      };

      return summary;
    } catch (error) {
      console.error('Error getting session summary:', error);
      return { totalEvents: 0, events: [] };
    }
  }
}

module.exports = AnalyticsService;
