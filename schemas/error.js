const Joi = require('joi');

const errorSchema = Joi.object({
  code: Joi.string().required().valid(
    'VALIDATION_ERROR',
    'JSON_REPAIR',
    'CRISIS_DETECTED',
    'RATE_LIMIT_EXCEEDED',
    'INVALID_SESSION',
    'SCHEMA_VALIDATION_FAILED',
    'AI_PROCESSING_ERROR',
    'INTERNAL_SERVER_ERROR'
  ),
  message: Joi.string().required().max(500),
  details: Joi.object().optional(),
  repairNotes: Joi.string().max(1000).optional(),
  timestamp: Joi.date().iso().required()
});

const crisisResponseSchema = Joi.object({
  code: Joi.string().valid('CRISIS_DETECTED').required(),
  message: Joi.string().valid('We detected content that suggests you may be in crisis. Please reach out to a mental health professional or crisis hotline immediately. In the US: 988 Suicide & Crisis Lifeline. In the UK: 116 123 Samaritans. In Canada: 1-833-456-4566 Crisis Services Canada.').required(),
  resources: Joi.array().items(Joi.string()).required(),
  timestamp: Joi.date().iso().required()
});

module.exports = {
  errorSchema,
  crisisResponseSchema
};
