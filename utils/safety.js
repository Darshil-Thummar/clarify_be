const natural = require('natural');
const sanitizeHtml = require('sanitize-html');

// Crisis detection keywords and patterns
const crisisKeywords = [
  'suicide', 'kill myself', 'end it all', 'not worth living', 'better off dead',
  'hurt myself', 'self harm', 'cutting', 'overdose', 'jump off', 'hang myself',
  'want to die', 'death wish', 'no point', 'hopeless', 'worthless', 'burden',
  'crisis', 'emergency', 'help me', 'can\'t go on', 'give up', 'final solution'
];

const crisisPatterns = [
  /i want to (die|kill myself|end it all)/i,
  /i should (die|kill myself|end it all)/i,
  /i'm going to (die|kill myself|end it all)/i,
  /i can't (go on|take it anymore|handle this)/i,
  /i'm (hopeless|worthless|a burden)/i,
  /there's no (point|hope|reason)/i,
  /i (hate|despise) myself/i,
  /i (wish|want) i was (dead|never born)/i
];

// PII detection patterns
const piiPatterns = {
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  phone: /\b(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})\b/g,
  ssn: /\b\d{3}-?\d{2}-?\d{4}\b/g,
  creditCard: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
  name: /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g
};

// Prompt injection patterns
const promptInjectionPatterns = [
  /ignore previous instructions/i,
  /forget everything/i,
  /you are now/i,
  /pretend to be/i,
  /act as if/i,
  /roleplay as/i,
  /system prompt/i,
  /jailbreak/i,
  /override/i,
  /bypass/i
];

class SafetyUtils {
  /**
   * Detect if input contains crisis content
   * @param {string} input - User input text
   * @returns {boolean} - True if crisis detected
   */
  static detectCrisis(input) {
    if (!input || typeof input !== 'string') return false;
    
    const lowerInput = input.toLowerCase();
    
    // Check for crisis keywords
    for (const keyword of crisisKeywords) {
      if (lowerInput.includes(keyword.toLowerCase())) {
        return true;
      }
    }
    
    // Check for crisis patterns
    for (const pattern of crisisPatterns) {
      if (pattern.test(input)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Sanitize input text by removing dangerous content
   * @param {string} input - Raw input text
   * @returns {string} - Sanitized text
   */
  static sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';
    
    // Remove HTML tags and scripts
    let sanitized = sanitizeHtml(input, {
      allowedTags: [],
      allowedAttributes: {}
    });
    
    // Remove URLs
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[URL_REMOVED]');
    
    // Remove prompt injection attempts
    for (const pattern of promptInjectionPatterns) {
      sanitized = sanitized.replace(pattern, '[INJECTION_ATTEMPT_REMOVED]');
    }
    
    // Trim and limit length
    sanitized = sanitized.trim().substring(0, 10000);
    
    return sanitized;
  }

  /**
   * Redact PII from text
   * @param {string} text - Text to redact
   * @param {boolean} redactNames - Whether to redact names
   * @returns {string} - Text with PII redacted
   */
  static redactPII(text, redactNames = true) {
    if (!text || typeof text !== 'string') return '';
    
    let redacted = text;
    
    // Redact email addresses
    redacted = redacted.replace(piiPatterns.email, '[EMAIL_REDACTED]');
    
    // Redact phone numbers
    redacted = redacted.replace(piiPatterns.phone, '[PHONE_REDACTED]');
    
    // Redact SSN
    redacted = redacted.replace(piiPatterns.ssn, '[SSN_REDACTED]');
    
    // Redact credit card numbers
    redacted = redacted.replace(piiPatterns.creditCard, '[CARD_REDACTED]');
    
    // Redact names if requested
    if (redactNames) {
      redacted = redacted.replace(piiPatterns.name, '[NAME_REDACTED]');
    }
    
    return redacted;
  }

  /**
   * Check if input contains prompt injection attempts
   * @param {string} input - User input
   * @returns {boolean} - True if injection detected
   */
  static detectPromptInjection(input) {
    if (!input || typeof input !== 'string') return false;
    
    for (const pattern of promptInjectionPatterns) {
      if (pattern.test(input)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get crisis response object
   * @returns {Object} - Crisis response
   */
  static getCrisisResponse() {
    return {
      code: 'CRISIS_DETECTED',
      message: 'We detected content that suggests you may be in crisis. Please reach out to a mental health professional or crisis hotline immediately. In the US: 988 Suicide & Crisis Lifeline. In the UK: 116 123 Samaritans. In Canada: 1-833-456-4566 Crisis Services Canada.',
      resources: [
        '988 Suicide & Crisis Lifeline (US)',
        '116 123 Samaritans (UK)',
        '1-833-456-4566 Crisis Services Canada',
        'International Association for Suicide Prevention: https://www.iasp.info/resources/Crisis_Centres/'
      ],
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Validate and clean input for processing
   * @param {string} input - Raw input
   * @param {boolean} storageOptIn - Whether user opted into storage
   * @param {boolean} redactNames - Whether to redact names
   * @returns {Object} - Validation result
   */
  static validateInput(input, storageOptIn = false, redactNames = true) {
    if (!input || typeof input !== 'string') {
      return {
        isValid: false,
        error: 'Invalid input provided'
      };
    }

    // Check for crisis content first
    if (this.detectCrisis(input)) {
      return {
        isValid: false,
        isCrisis: true,
        response: this.getCrisisResponse()
      };
    }

    // Check for prompt injection
    if (this.detectPromptInjection(input)) {
      return {
        isValid: false,
        error: 'Invalid input detected'
      };
    }

    // Sanitize input
    const sanitized = this.sanitizeInput(input);
    
    if (sanitized.length === 0) {
      return {
        isValid: false,
        error: 'Input is empty after sanitization'
      };
    }

    // Redact PII if not storing or if redaction is enabled
    const processedInput = (storageOptIn && !redactNames) ? sanitized : this.redactPII(sanitized, redactNames);

    return {
      isValid: true,
      processedInput,
      originalLength: input.length,
      sanitizedLength: sanitized.length
    };
  }
}

module.exports = SafetyUtils;
