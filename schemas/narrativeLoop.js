const Joi = require('joi');

const narrativeLoopSchema = Joi.object({
  trigger: Joi.string().required().min(1).max(1000),
  fear: Joi.string().required().min(1).max(1000),
  emotion: Joi.string().required().min(1).max(1000),
  outcome: Joi.string().required().min(1).max(1000),
  whyItFeelsReal: Joi.string().required().min(1).max(1000),
  hiddenLogic: Joi.string().required().min(1).max(1000),
  breakingActions: Joi.array().items(Joi.string().min(1).max(500)).min(1).max(5).required(),
  mechanisms: Joi.array().items(Joi.string().min(1).max(200)).min(1).max(10).required()
});

const narrativeLoopRepairSchema = Joi.object({
  trigger: Joi.string().allow('').max(1000),
  fear: Joi.string().allow('').max(1000),
  emotion: Joi.string().allow('').max(1000),
  outcome: Joi.string().allow('').max(1000),
  whyItFeelsReal: Joi.string().allow('').max(1000),
  hiddenLogic: Joi.string().allow('').max(1000),
  breakingActions: Joi.array().items(Joi.string().max(500)).max(5),
  mechanisms: Joi.array().items(Joi.string().max(200)).max(10)
});

module.exports = {
  narrativeLoopSchema,
  narrativeLoopRepairSchema
};
