const Joi = require('joi');

const needsEnum = [
  'safety',
  'belonging',
  'autonomy',
  'competence',
  'purpose',
  'connection',
  'recognition',
  'control',
  'predictability',
  'growth',
  'contribution',
  'meaning'
];

const spiessMapSchema = Joi.object({
  sensations: Joi.array().items(Joi.string().min(1).max(200)).min(1).max(5).required(),
  emotions: Joi.array().items(Joi.string().min(1).max(200)).min(1).max(5).required(),
  needs: Joi.array().items(Joi.string().valid(...needsEnum)).min(1).max(3).required(),
  confirmationBias: Joi.string().required().min(1).max(1000),
  microTest: Joi.object({
    description: Joi.string().required().min(1).max(500),
    timeframe: Joi.string().required().min(1).max(100),
    successCriteria: Joi.string().required().min(1).max(300)
  }).required(),
  toolAction: Joi.object({
    protocol: Joi.string().valid('STOP', 'Values First', 'Bridge Belief').required(),
    steps: Joi.array().items(Joi.string().min(1).max(300)).min(1).max(5).required(),
    example: Joi.string().required().min(1).max(500)
  }).required()
});

const spiessMapRepairSchema = Joi.object({
  sensations: Joi.array().items(Joi.string().max(200)).max(5),
  emotions: Joi.array().items(Joi.string().max(200)).max(5),
  needs: Joi.array().items(Joi.string().valid(...needsEnum)).max(3),
  confirmationBias: Joi.string().allow('').max(1000),
  microTest: Joi.object({
    description: Joi.string().allow('').max(500),
    timeframe: Joi.string().allow('').max(100),
    successCriteria: Joi.string().allow('').max(300)
  }),
  toolAction: Joi.object({
    protocol: Joi.string().valid('STOP', 'Values First', 'Bridge Belief'),
    steps: Joi.array().items(Joi.string().max(300)).max(5),
    example: Joi.string().allow('').max(500)
  })
});

module.exports = {
  spiessMapSchema,
  spiessMapRepairSchema,
  needsEnum
};
