const OpenAI = require('openai');
const { v4: uuidv4 } = require('uuid');
const SafetyUtils = require('../utils/safety');
const AnalyticsService = require('./analyticsService');
const { 
  narrativeLoopSchema, 
  spiessMapSchema, 
  needsEnum 
} = require('../schemas');

class AnalysisService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  /**
   * Attempt to extract and parse JSON from a model response.
   * Tries direct parse, fenced blocks, and balanced brace extraction.
   * @param {string} text
   * @returns {{ok: true, data: any} | {ok: false, error: Error}}
   */
  safeJsonParse(text) {
    try {
      return { ok: true, data: JSON.parse(text) };
    } catch (e1) {
      // Try fenced ```json ... ``` block
      const fencedMatch = text.match(/```json\s*([\s\S]*?)\s*```/i) || text.match(/```\s*([\s\S]*?)\s*```/i);
      if (fencedMatch && fencedMatch[1]) {
        try {
          return { ok: true, data: JSON.parse(fencedMatch[1]) };
        } catch (e2) {}
      }

      // Try balanced braces extraction
      const firstBrace = text.indexOf('{');
      const lastBrace = text.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const candidate = text.slice(firstBrace, lastBrace + 1);
        // Attempt to ensure balanced braces by scanning
        let depth = 0;
        let end = -1;
        for (let i = 0; i < candidate.length; i++) {
          const ch = candidate[i];
          if (ch === '{') depth++;
          else if (ch === '}') {
            depth--;
            if (depth === 0) { end = i; break; }
          }
        }
        if (end !== -1) {
          const balanced = candidate.slice(0, end + 1);
          try {
            return { ok: true, data: JSON.parse(balanced) };
          } catch (e3) {}
        } else {
          try {
            return { ok: true, data: JSON.parse(candidate) };
          } catch (e4) {}
        }
      }

      return { ok: false, error: e1 };
    }
  }

  /**
   * One retry to coerce/repair invalid JSON using the model.
   * Returns only the repaired JSON (no prose).
   * @param {string} instruction - Short description of required JSON shape
   * @param {string} rawContent - The invalid content to fix
   */
  async retryJsonFix(instruction, rawContent) {
    const messages = [
      { role: 'system', content: 'You are a strict JSON reformatter. Output ONLY valid JSON. No prose, no backticks.' },
      { role: 'user', content: `Convert the following into valid JSON that matches: ${instruction}\n\nContent to fix:\n${rawContent}` }
    ];
    const resp = await this.openai.chat.completions.create({
      model: 'gpt-4',
      messages,
      max_tokens: 2000,
      temperature: 0
    });
    return resp.choices[0].message.content;
  }

  /**
   * Main analysis function that processes input through all stages
   * @param {string} input - User input
   * @param {Object} options - Analysis options
   * @param {Object} req - Express request object
   * @returns {Object} - Analysis result
   */
  async analyze(input, options = {}, req = null) {
    const sessionId = uuidv4();
    const startTime = Date.now();
    
    try {
      // Track session start
      await AnalyticsService.trackSessionStarted(sessionId, options.userId, req);
      
      // Validate and sanitize input
      const validation = SafetyUtils.validateInput(
        input, 
        options.storageOptIn || false, 
        options.redactNames !== false
      );

      if (!validation.isValid) {
        if (validation.isCrisis) {
          await AnalyticsService.trackSafeExit(sessionId, 'crisis_detected', options.userId, req);
          return {
            success: false,
            sessionId,
            response: validation.response
          };
        }
        
        await AnalyticsService.trackSafeExit(sessionId, 'invalid_input', options.userId, req);
        return {
          success: false,
          sessionId,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Track input received
      await AnalyticsService.trackInputReceived(sessionId, validation.processedInput.length, options.userId, req);

      // Check if clarifying questions are needed
      const needsQuestions = await this.needsClarifyingQuestions(validation.processedInput);
      
      if (needsQuestions) {
        const questions = await this.generateClarifyingQuestions(validation.processedInput);
        await AnalyticsService.trackQuestionsAsked(sessionId, questions, options.userId, req);
        
        return {
          success: true,
          sessionId,
          stage: 'clarifying_questions',
          questions,
          needsAnswers: true
        };
      }

      // Process through all stages
      const result = await this.processStages(validation.processedInput, sessionId, options, req);
      
      const processingTime = Date.now() - startTime;
      console.log(`Analysis completed in ${processingTime}ms for session ${sessionId}`);
      
      return {
        success: true,
        sessionId,
        ...result,
        processingTime
      };

    } catch (error) {
      console.error('Analysis error:', error);
      await AnalyticsService.trackSafeExit(sessionId, 'processing_error', options.userId, req);
      
      return {
        success: false,
        sessionId,
        error: {
          code: 'AI_PROCESSING_ERROR',
          message: 'Analysis failed due to processing error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Process answers to clarifying questions
   * @param {string} sessionId - Session ID
   * @param {Array} answers - User answers
   * @param {Object} options - Processing options
   * @param {Object} req - Express request object
   * @returns {Object} - Analysis result
   */
  async processAnswers(sessionId, answers, options = {}, req = null) {
    try {
      // Merge answers with original input
      const mergedInput = await this.mergeAnswersWithInput(sessionId, answers);
      
      // Process through all stages
      const result = await this.processStages(mergedInput, sessionId, options, req);
      
      return {
        success: true,
        sessionId,
        ...result
      };

    } catch (error) {
      console.error('Answer processing error:', error);
      return {
        success: false,
        sessionId,
        error: {
          code: 'AI_PROCESSING_ERROR',
          message: 'Answer processing failed',
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Check if clarifying questions are needed
   * @param {string} input - Processed input
   * @returns {boolean} - True if questions needed
   */
  async needsClarifyingQuestions(input) {
    const prompt = `Analyze this input and determine if clarifying questions are needed. 
    Return only "YES" or "NO" based on whether any of these are missing or unclear:
    - Trigger (what started this)
    - Fear (what are they afraid of)
    - Emotion (what they're feeling)
    - Outcome (what they expect to happen)
    
    Input: ${input}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 10,
        temperature: 0.1
      });

      return response.choices[0].message.content.trim().toUpperCase() === 'YES';
    } catch (error) {
      console.error('Error checking for clarifying questions:', error);
      return false; // Default to no questions if error
    }
  }

  /**
   * Generate clarifying questions
   * @param {string} input - Processed input
   * @returns {Array} - Array of up to 3 questions
   */
  async generateClarifyingQuestions(input) {
    const prompt = `Generate up to 3 clarifying questions to help understand this situation better. 
    Focus on missing: trigger, fear, emotion, or outcome.
    Return as a JSON array of strings, max 3 questions.
    
    Input: ${input}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 300,
        temperature: 0.3
      });
      const raw = response.choices[0].message.content;
      let parsed = this.safeJsonParse(raw);
      if (!parsed.ok) {
        // One retry to coerce to JSON array
        const fixed = await this.retryJsonFix('a JSON array of up to 3 strings', raw);
        parsed = this.safeJsonParse(fixed);
      }
      const questions = parsed.ok ? parsed.data : [];
      return Array.isArray(questions) ? questions.slice(0, 3) : [];
    } catch (error) {
      console.error('Error generating clarifying questions:', error);
      return [];
    }
  }

  /**
   * Merge answers with original input
   * @param {string} sessionId - Session ID
   * @param {Array} answers - User answers
   * @returns {string} - Merged input
   */
  async mergeAnswersWithInput(sessionId, answers) {
    // This would typically retrieve the original input from the session
    // For now, combine just the textual answers
    try {
      if (!Array.isArray(answers)) return '';
      const parts = answers.map(a => {
        if (!a) return '';
        if (typeof a === 'string') return a;
        if (typeof a.answer === 'string') return a.answer;
        return '';
      }).filter(Boolean);
      return parts.join(' ');
    } catch (_e) {
      return '';
    }
  }

  /**
   * Process input through all analysis stages
   * @param {string} input - Processed input
   * @param {string} sessionId - Session ID
   * @param {Object} options - Processing options
   * @param {Object} req - Express request object
   * @returns {Object} - Complete analysis result
   */
  async processStages(input, sessionId, options = {}, req = null) {
    // Stage 1: Narrative Loop
    const narrativeLoop = await this.buildNarrativeLoop(input);
    await AnalyticsService.trackLoopBuilt(sessionId, narrativeLoop, options.userId, req);

    // Stage 2: SPIESS Map
    const spiessMap = await this.buildSpiessMap(narrativeLoop);
    await AnalyticsService.trackSpiessBuilt(sessionId, spiessMap, options.userId, req);

    // Stage 3: Summary
    const summary = await this.buildSummary(narrativeLoop, spiessMap);
    await AnalyticsService.trackSummaryBuilt(sessionId, summary, options.userId, req);

    // Detect mechanisms and tags
    const tags = await this.detectMechanisms(narrativeLoop, spiessMap);

    return {
      narrativeLoop,
      spiessMap,
      summary,
      tags,
      stage: 'completed'
    };
  }

  /**
   * Build narrative loop (Stage 1)
   * @param {string} input - Processed input
   * @returns {Object} - Narrative loop data
   */
  async buildNarrativeLoop(input) {
    const prompt = `Extract a narrative loop from this input. Return a JSON object with these exact fields:
    {
      "trigger": "What started this situation (max 1000 chars)",
      "fear": "What they're afraid of (max 1000 chars)",
      "emotion": "What they're feeling (max 1000 chars)",
      "outcome": "What they expect to happen (max 1000 chars)",
      "whyItFeelsReal": "Why this fear feels real to them (max 1000 chars)",
      "hiddenLogic": "The hidden logic driving this (max 1000 chars)",
      "breakingActions": ["Action 1", "Action 2", "Action 3"] (1-5 actions, max 500 chars each),
      "mechanisms": ["mechanism1", "mechanism2"] (1-10 mechanisms, max 200 chars each)
    }
    
    Input: ${input}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.3
      });
      const raw = response.choices[0].message.content;
      let parsed = this.safeJsonParse(raw);
      if (!parsed.ok) {
        // One retry: ask model to return only valid JSON
        const fixed = await this.retryJsonFix('a JSON object with keys: trigger, fear, emotion, outcome, whyItFeelsReal, hiddenLogic, breakingActions (array of strings), mechanisms (array of strings)', raw);
        parsed = this.safeJsonParse(fixed);
      }
      let narrativeLoop = parsed.ok ? parsed.data : {};
      // Normalize before validation to reduce errors
      narrativeLoop = this.normalizeNarrativeLoop(narrativeLoop);
      
      // Validate against schema
      const { error } = narrativeLoopSchema.validate(narrativeLoop);
      if (error) {
        console.error('Narrative loop validation error:', error);
        return this.repairNarrativeLoop(narrativeLoop);
      }

      return narrativeLoop;
    } catch (error) {
      console.error('Error building narrative loop:', error);
      return this.getDefaultNarrativeLoop();
    }
  }

  /**
   * Build SPIESS map (Stage 2)
   * @param {Object} narrativeLoop - Narrative loop data
   * @returns {Object} - SPIESS map data
   */
  async buildSpiessMap(narrativeLoop) {
    const prompt = `Convert this narrative loop into a SPIESS map. Return a JSON object with these exact fields:
    {
      "sensations": ["physical sensation 1", "physical sensation 2"] (1-5 sensations, max 200 chars each),
      "emotions": ["emotion 1", "emotion 2"] (1-5 emotions, max 200 chars each),
      "needs": ["need1", "need2"] (1-3 needs from: ${needsEnum.join(', ')}),
      "confirmationBias": "Cause-effect sentence about confirmation bias (max 1000 chars)",
      "microTest": {
        "description": "Test description (max 500 chars)",
        "timeframe": "Within 24 hours (max 100 chars)",
        "successCriteria": "How to measure success (max 300 chars)"
      },
      "toolAction": {
        "protocol": "STOP" or "Values First" or "Bridge Belief",
        "steps": ["Step 1", "Step 2", "Step 3"] (1-5 steps, max 300 chars each),
        "example": "Concrete example (max 500 chars)"
      }
    }
    
    Narrative Loop: ${JSON.stringify(narrativeLoop)}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 2000,
        temperature: 0.3
      });
      const raw = response.choices[0].message.content;
      let parsed = this.safeJsonParse(raw);
      if (!parsed.ok) {
        const fixed = await this.retryJsonFix('a JSON object with keys: sensations (array of strings), emotions (array of strings), needs (array of strings), confirmationBias (string), microTest (object with description, timeframe, successCriteria), toolAction (object with protocol, steps array, example)', raw);
        parsed = this.safeJsonParse(fixed);
      }
      let spiessMap = parsed.ok ? parsed.data : {};
      // Normalize before validation to reduce errors
      spiessMap = this.normalizeSpiessMap(spiessMap);
      
      // Validate against schema
      const { error } = spiessMapSchema.validate(spiessMap);
      if (error) {
        console.error('SPIESS map validation error:', error);
        return this.repairSpiessMap(spiessMap);
      }

      return spiessMap;
    } catch (error) {
      console.error('Error building SPIESS map:', error);
      return this.getDefaultSpiessMap();
    }
  }

  /**
   * Build summary (Stage 3)
   * @param {Object} narrativeLoop - Narrative loop data
   * @param {Object} spiessMap - SPIESS map data
   * @returns {Object} - Summary data
   */
  async buildSummary(narrativeLoop, spiessMap) {
    const prompt = `Create a concise summary under 250 words. Return a JSON object with these exact fields:
    {
      "content": "Summary under 250 words that names key mechanisms and provides insight",
      "mechanisms": ["mechanism1", "mechanism2"] (1-5 key mechanisms, max 100 chars each),
      "nextStep": "One clear next step (max 200 chars)"
    }
    
    Narrative Loop: ${JSON.stringify(narrativeLoop)}
    SPIESS Map: ${JSON.stringify(spiessMap)}`;

    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
        temperature: 0.3
      });
      const raw = response.choices[0].message.content;
      let parsed = this.safeJsonParse(raw);
      if (!parsed.ok) {
        const fixed = await this.retryJsonFix('a JSON object with keys: content (string), mechanisms (array of strings), nextStep (string)', raw);
        parsed = this.safeJsonParse(fixed);
      }
      const summary = parsed.ok ? parsed.data : this.getDefaultSummary();
      
      // Ensure content is under 250 words
      if (summary.content && summary.content.split(' ').length > 250) {
        summary.content = summary.content.split(' ').slice(0, 250).join(' ');
      }

      return summary;
    } catch (error) {
      console.error('Error building summary:', error);
      return this.getDefaultSummary();
    }
  }

  /**
   * Detect mechanisms and generate tags
   * @param {Object} narrativeLoop - Narrative loop data
   * @param {Object} spiessMap - SPIESS map data
   * @returns {Array} - Array of detected tags
   */
  async detectMechanisms(narrativeLoop, spiessMap) {
    const tags = [];
    
    // Check for specific mechanisms
    const text = `${JSON.stringify(narrativeLoop)} ${JSON.stringify(spiessMap)}`.toLowerCase();
    
    if (text.includes('confirmation bias') || text.includes('confirmation_bias')) {
      tags.push('confirmation_bias');
    }
    
    if (text.includes('rejection') || text.includes('rejection_sensitivity')) {
      tags.push('fear_of_rejection');
    }
    
    if (text.includes('control') || text.includes('autonomy')) {
      tags.push('autonomy_threat');
    }
    
    if (text.includes('perfect') || text.includes('perfectionism')) {
      tags.push('perfectionism');
    }
    
    if (text.includes('people pleas') || text.includes('approval')) {
      tags.push('people_pleasing');
    }
    
    if (text.includes('boundary') || text.includes('limit')) {
      tags.push('boundary_signaling');
    }
    
    if (text.includes('attention') || text.includes('test')) {
      tags.push('attention_testing');
    }
    
    if (text.includes('vulnerable') || text.includes('vulnerability')) {
      tags.push('vulnerability_avoidance');
    }
    
    return [...new Set(tags)]; // Remove duplicates
  }

  /**
   * Normalize narrative loop fields: trim, ensure arrays are arrays.
   */
  normalizeNarrativeLoop(nl) {
    const sanitizeString = (val) => (typeof val === 'string' ? val.trim() : '');
    const sanitizeArray = (arr) => (Array.isArray(arr) ? arr.map(v => sanitizeString(v)).filter(Boolean) : []);
    return {
      trigger: sanitizeString(nl?.trigger),
      fear: sanitizeString(nl?.fear),
      emotion: sanitizeString(nl?.emotion),
      outcome: sanitizeString(nl?.outcome),
      whyItFeelsReal: sanitizeString(nl?.whyItFeelsReal),
      hiddenLogic: sanitizeString(nl?.hiddenLogic),
      breakingActions: sanitizeArray(nl?.breakingActions),
      mechanisms: sanitizeArray(nl?.mechanisms)
    };
  }

  /**
   * Normalize SPIESS map: lowercase needs, trim strings, ensure arrays.
   */
  normalizeSpiessMap(sp) {
    const sanitizeString = (val) => (typeof val === 'string' ? val.trim() : '');
    const sanitizeArray = (arr) => (Array.isArray(arr) ? arr.map(v => sanitizeString(v)).filter(Boolean) : []);
    return {
      sensations: sanitizeArray(sp?.sensations),
      emotions: sanitizeArray(sp?.emotions),
      needs: sanitizeArray(sp?.needs).map(n => n.toLowerCase()),
      confirmationBias: sanitizeString(sp?.confirmationBias),
      microTest: {
        description: sanitizeString(sp?.microTest?.description),
        timeframe: sanitizeString(sp?.microTest?.timeframe),
        successCriteria: sanitizeString(sp?.microTest?.successCriteria)
      },
      toolAction: {
        protocol: sanitizeString(sp?.toolAction?.protocol),
        steps: sanitizeArray(sp?.toolAction?.steps),
        example: sanitizeString(sp?.toolAction?.example)
      }
    };
  }

  /**
   * Repair narrative loop if validation fails
   * @param {Object} narrativeLoop - Invalid narrative loop
   * @returns {Object} - Repaired narrative loop
   */
  repairNarrativeLoop(narrativeLoop) {
    const sanitizeString = (val, fallback) => {
      const s = typeof val === 'string' ? val.trim() : '';
      return s.length > 0 ? s : fallback;
    };
    const sanitizeArray = (arr, fallbackItem) => {
      if (!Array.isArray(arr)) return [fallbackItem];
      const cleaned = arr
        .map(v => (typeof v === 'string' ? v.trim() : ''))
        .filter(v => v.length > 0);
      return cleaned.length > 0 ? cleaned : [fallbackItem];
    };
    return {
      trigger: sanitizeString(narrativeLoop.trigger, 'Hypothesis: Trigger not clearly identified'),
      fear: sanitizeString(narrativeLoop.fear, 'Hypothesis: Fear not clearly identified'),
      emotion: sanitizeString(narrativeLoop.emotion, 'Hypothesis: Emotion not clearly identified'),
      outcome: sanitizeString(narrativeLoop.outcome, 'Hypothesis: Outcome not clearly identified'),
      whyItFeelsReal: sanitizeString(narrativeLoop.whyItFeelsReal, 'Hypothesis: Why it feels real not clearly identified'),
      hiddenLogic: sanitizeString(narrativeLoop.hiddenLogic, 'Hypothesis: Hidden logic not clearly identified'),
      breakingActions: sanitizeArray(narrativeLoop.breakingActions, 'Hypothesis: Breaking action not clearly identified'),
      mechanisms: sanitizeArray(narrativeLoop.mechanisms, 'Hypothesis: Mechanism not clearly identified')
    };
  }

  /**
   * Repair SPIESS map if validation fails
   * @param {Object} spiessMap - Invalid SPIESS map
   * @returns {Object} - Repaired SPIESS map
   */
  repairSpiessMap(spiessMap) {
    const sanitizeString = (val, fallback) => {
      const s = typeof val === 'string' ? val.trim() : '';
      return s.length > 0 ? s : fallback;
    };
    const sanitizeArray = (arr, fallbackItem, max = undefined) => {
      let items = Array.isArray(arr) ? arr : [];
      items = items
        .map(v => (typeof v === 'string' ? v.trim() : ''))
        .filter(v => v.length > 0);
      if (items.length === 0) items = [fallbackItem];
      if (typeof max === 'number') items = items.slice(0, max);
      return items;
    };
    const allowedNeeds = require('../schemas').needsEnum;
    const sanitizeNeeds = (arr) => {
      const items = Array.isArray(arr) ? arr : [];
      const filtered = items
        .map(v => (typeof v === 'string' ? v.trim() : ''))
        .filter(v => allowedNeeds.includes(v));
      return filtered.length > 0 ? filtered.slice(0, 3) : ['safety'];
    };
    const sanitizeProtocol = (val) => {
      const allowed = ['STOP', 'Values First', 'Bridge Belief'];
      const v = typeof val === 'string' ? val.trim() : '';
      return allowed.includes(v) ? v : 'STOP';
    };

    const micro = spiessMap.microTest || {};
    const tool = spiessMap.toolAction || {};

    return {
      sensations: sanitizeArray(spiessMap.sensations, 'Hypothesis: Sensation not clearly identified', 5),
      emotions: sanitizeArray(spiessMap.emotions, 'Hypothesis: Emotion not clearly identified', 5),
      needs: sanitizeNeeds(spiessMap.needs),
      confirmationBias: sanitizeString(spiessMap.confirmationBias, 'Hypothesis: Confirmation bias not clearly identified'),
      microTest: {
        description: sanitizeString(micro.description, 'Hypothesis: Micro test not clearly identified'),
        timeframe: sanitizeString(micro.timeframe, 'Within 24 hours'),
        successCriteria: sanitizeString(micro.successCriteria, 'Hypothesis: Success criteria not clearly identified')
      },
      toolAction: {
        protocol: sanitizeProtocol(tool.protocol),
        steps: sanitizeArray(tool.steps, 'Hypothesis: Tool action step not clearly identified', 5),
        example: sanitizeString(tool.example, 'Hypothesis: Tool action example not clearly identified')
      }
    };
  }

  /**
   * Get default narrative loop for error cases
   * @returns {Object} - Default narrative loop
   */
  getDefaultNarrativeLoop() {
    return {
      trigger: 'Unable to identify trigger',
      fear: 'Unable to identify fear',
      emotion: 'Unable to identify emotion',
      outcome: 'Unable to identify outcome',
      whyItFeelsReal: 'Unable to identify why it feels real',
      hiddenLogic: 'Unable to identify hidden logic',
      breakingActions: ['Unable to identify breaking actions'],
      mechanisms: ['Unable to identify mechanisms']
    };
  }

  /**
   * Get default SPIESS map for error cases
   * @returns {Object} - Default SPIESS map
   */
  getDefaultSpiessMap() {
    return {
      sensations: ['Unable to identify sensations'],
      emotions: ['Unable to identify emotions'],
      needs: ['safety'],
      confirmationBias: 'Unable to identify confirmation bias',
      microTest: {
        description: 'Unable to identify micro test',
        timeframe: 'Within 24 hours',
        successCriteria: 'Unable to identify success criteria'
      },
      toolAction: {
        protocol: 'STOP',
        steps: ['Unable to identify tool action steps'],
        example: 'Unable to identify tool action example'
      }
    };
  }

  /**
   * Get default summary for error cases
   * @returns {Object} - Default summary
   */
  getDefaultSummary() {
    return {
      content: 'Unable to generate summary due to processing error.',
      mechanisms: ['Unable to identify mechanisms'],
      nextStep: 'Please try again or contact support if the issue persists.'
    };
  }
}

module.exports = new AnalysisService();
