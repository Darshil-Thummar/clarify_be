const Joi = require('joi');
const { 
  narrativeLoopSchema, 
  narrativeLoopRepairSchema,
  spiessMapSchema, 
  spiessMapRepairSchema,
  sessionSchema,
  sessionRepairSchema,
  errorSchema,
  feedbackSchema
} = require('../schemas');

class SchemaValidationMiddleware {
  /**
   * Validate narrative loop schema
   * @param {Object} data - Data to validate
   * @param {boolean} repair - Whether to attempt repair
   * @returns {Object} - Validation result
   */
  static validateNarrativeLoop(data, repair = false) {
    const schema = repair ? narrativeLoopRepairSchema : narrativeLoopSchema;
    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      return {
        isValid: false,
        error: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })),
        data: repair ? value : null
      };
    }

    return {
      isValid: true,
      data: value
    };
  }

  /**
   * Validate SPIESS map schema
   * @param {Object} data - Data to validate
   * @param {boolean} repair - Whether to attempt repair
   * @returns {Object} - Validation result
   */
  static validateSpiessMap(data, repair = false) {
    const schema = repair ? spiessMapRepairSchema : spiessMapSchema;
    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      return {
        isValid: false,
        error: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })),
        data: repair ? value : null
      };
    }

    return {
      isValid: true,
      data: value
    };
  }

  /**
   * Validate session schema
   * @param {Object} data - Data to validate
   * @param {boolean} repair - Whether to attempt repair
   * @returns {Object} - Validation result
   */
  static validateSession(data, repair = false) {
    const schema = repair ? sessionRepairSchema : sessionSchema;
    const { error, value } = schema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      return {
        isValid: false,
        error: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        })),
        data: repair ? value : null
      };
    }

    return {
      isValid: true,
      data: value
    };
  }

  /**
   * Validate error schema
   * @param {Object} data - Data to validate
   * @returns {Object} - Validation result
   */
  static validateError(data) {
    const { error, value } = errorSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      return {
        isValid: false,
        error: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      };
    }

    return {
      isValid: true,
      data: value
    };
  }

  /**
   * Validate feedback schema
   * @param {Object} data - Data to validate
   * @returns {Object} - Validation result
   */
  static validateFeedback(data) {
    const { error, value } = feedbackSchema.validate(data, { 
      abortEarly: false,
      stripUnknown: true 
    });

    if (error) {
      return {
        isValid: false,
        error: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }))
      };
    }

    return {
      isValid: true,
      data: value
    };
  }

  /**
   * Repair data structure for narrative loop
   * @param {Object} data - Data to repair
   * @returns {Object} - Repaired data
   */
  static repairNarrativeLoop(data) {
    const repairResult = this.validateNarrativeLoop(data, true);
    
    if (repairResult.isValid) {
      return {
        success: true,
        data: repairResult.data,
        repairNotes: 'Data structure repaired successfully'
      };
    }

    // Manual repair for common issues
    const repaired = {
      trigger: data.trigger || 'Hypothesis: Trigger not clearly identified',
      fear: data.fear || 'Hypothesis: Fear not clearly identified',
      emotion: data.emotion || 'Hypothesis: Emotion not clearly identified',
      outcome: data.outcome || 'Hypothesis: Outcome not clearly identified',
      whyItFeelsReal: data.whyItFeelsReal || 'Hypothesis: Why it feels real not clearly identified',
      hiddenLogic: data.hiddenLogic || 'Hypothesis: Hidden logic not clearly identified',
      breakingActions: Array.isArray(data.breakingActions) ? data.breakingActions : ['Hypothesis: Breaking actions not clearly identified'],
      mechanisms: Array.isArray(data.mechanisms) ? data.mechanisms : ['Hypothesis: Mechanisms not clearly identified']
    };

    return {
      success: true,
      data: repaired,
      repairNotes: 'Data structure manually repaired with hypothesis placeholders'
    };
  }

  /**
   * Repair data structure for SPIESS map
   * @param {Object} data - Data to repair
   * @returns {Object} - Repaired data
   */
  static repairSpiessMap(data) {
    const repairResult = this.validateSpiessMap(data, true);
    
    if (repairResult.isValid) {
      return {
        success: true,
        data: repairResult.data,
        repairNotes: 'Data structure repaired successfully'
      };
    }

    // Manual repair for common issues
    const repaired = {
      sensations: Array.isArray(data.sensations) ? data.sensations : ['Hypothesis: Sensations not clearly identified'],
      emotions: Array.isArray(data.emotions) ? data.emotions : ['Hypothesis: Emotions not clearly identified'],
      needs: Array.isArray(data.needs) ? data.needs : ['safety'],
      confirmationBias: data.confirmationBias || 'Hypothesis: Confirmation bias not clearly identified',
      microTest: data.microTest || {
        description: 'Hypothesis: Micro test not clearly identified',
        timeframe: 'Within 24 hours',
        successCriteria: 'Hypothesis: Success criteria not clearly identified'
      },
      toolAction: data.toolAction || {
        protocol: 'STOP',
        steps: ['Hypothesis: Tool action steps not clearly identified'],
        example: 'Hypothesis: Tool action example not clearly identified'
      }
    };

    return {
      success: true,
      data: repaired,
      repairNotes: 'Data structure manually repaired with hypothesis placeholders'
    };
  }

  /**
   * Create error response for schema validation failure
   * @param {Array} errors - Validation errors
   * @param {string} code - Error code
   * @returns {Object} - Error response
   */
  static createErrorResponse(errors, code = 'SCHEMA_VALIDATION_FAILED') {
    return {
      code,
      message: 'Schema validation failed',
      details: errors,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Create repair error response
   * @param {string} repairNotes - Repair notes
   * @param {Object} data - Repaired data
   * @returns {Object} - Repair error response
   */
  static createRepairErrorResponse(repairNotes, data) {
    return {
      code: 'JSON_REPAIR',
      message: 'Data structure repaired with hypothesis placeholders',
      repairNotes,
      data,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = SchemaValidationMiddleware;
