const Joi = require('joi');

const sessionSchema = Joi.object({
  id: Joi.string().pattern(/^[a-fA-F0-9]{24}$/).required(),
  userId: Joi.string().optional(),
  status: Joi.string().valid('active', 'completed', 'deleted').required(),
  createdAt: Joi.date().iso().required(),
  updatedAt: Joi.date().iso().required(),
  input: Joi.string().max(10000).optional(),
  clarifyingQuestions: Joi.array().items(Joi.string().max(500)).max(3).optional(),
  narrativeLoop: Joi.object().optional(),
  spiessMap: Joi.object().optional(),
  summary: Joi.object({
    content: Joi.string().max(250).required(),
    mechanisms: Joi.array().items(Joi.string().max(100)).max(5).required(),
    nextStep: Joi.string().max(200).required()
  }).optional(),
  tags: Joi.array().items(Joi.string().valid(
    'fear_of_rejection',
    'autonomy_threat',
    'perfectionism',
    'people_pleasing',
    'boundary_signaling',
    'attention_testing',
    'vulnerability_avoidance'
  )).max(7).optional(),
  storageOptIn: Joi.boolean().default(false),
  redactNames: Joi.boolean().default(true)
});

const sessionRepairSchema = Joi.object({
  id: Joi.string().pattern(/^[a-fA-F0-9]{24}$/),
  userId: Joi.string().allow(''),
  status: Joi.string().valid('active', 'completed', 'deleted'),
  createdAt: Joi.date().iso(),
  updatedAt: Joi.date().iso(),
  input: Joi.string().max(10000).allow(''),
  clarifyingQuestions: Joi.array().items(Joi.string().max(500)).max(3),
  narrativeLoop: Joi.object().allow(null),
  spiessMap: Joi.object().allow(null),
  summary: Joi.object({
    content: Joi.string().max(250).allow(''),
    mechanisms: Joi.array().items(Joi.string().max(100)).max(5),
    nextStep: Joi.string().max(200).allow('')
  }).allow(null),
  tags: Joi.array().items(Joi.string().valid(
    'fear_of_rejection',
    'autonomy_threat',
    'perfectionism',
    'people_pleasing',
    'boundary_signaling',
    'attention_testing',
    'vulnerability_avoidance'
  )).max(7),
  storageOptIn: Joi.boolean(),
  redactNames: Joi.boolean()
});

module.exports = {
  sessionSchema,
  sessionRepairSchema
};
